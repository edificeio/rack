package fr.wseduc.rack.services;

import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.LinkedList;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import io.vertx.core.*;
import org.bson.conversions.Bson;
import org.entcore.common.storage.Storage;
import org.entcore.common.user.ExportResourceResult;
import org.entcore.common.user.RepositoryEvents;
import org.entcore.common.folders.FolderImporter;
import org.entcore.common.folders.FolderImporter.FolderImporterContext;
import org.entcore.common.utils.StringUtils;
import org.entcore.common.utils.FileUtils;


import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.mongodb.MongoQueryBuilder;
import fr.wseduc.rack.Rack;
import fr.wseduc.webutils.I18n;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import static com.mongodb.client.model.Filters.*;

public class RackRepositoryEvent implements RepositoryEvents {
	private final MongoDb mongo = MongoDb.getInstance();
	private final Vertx vertx;
	private final Storage storage;
	private final FolderImporter importer;
	private static final Logger log = LoggerFactory.getLogger(RackRepositoryEvent.class);
	protected final Pattern uuidPattern = Pattern.compile(StringUtils.UUID_REGEX);

	public RackRepositoryEvent(Vertx vertx, Storage storage) {
		this.storage = storage;
		this.vertx = vertx;
		this.importer = new FolderImporter(vertx, vertx.fileSystem(), vertx.eventBus(), false);
	}

	@Override
	public void deleteGroups(JsonArray arg0) {
		// nothing to do
	}

	private Future<List<JsonObject>> find(JsonObject query) {
		Promise<List<JsonObject>> promise = Promise.promise();
		mongo.find(Rack.RACK_COLLECTION, query, null, new JsonObject().put("file", 1), res -> {
			String status = res.body().getString("status");
			JsonArray results = res.body().getJsonArray("results");
			if ("ok".equals(status) && results != null) {
				List<JsonObject> objects = results.stream().filter(o -> o instanceof JsonObject)
						.map(r -> (JsonObject) r).collect(Collectors.toList());
				promise.complete(objects);
			} else {
				promise.fail("could not found racks");
			}
		});
		return promise.future();
	}

	private Future<Void> deleteFromDB(JsonObject query) {
		Promise<Void> promise = Promise.promise();
		mongo.delete(Rack.RACK_COLLECTION, query, event -> {
			if (!"ok".equals(event.body().getString("status"))) {
				log.error("Error deleting documents : " + event.body().encode());
				promise.fail("Error deleting documents : " + event.body().encode());
			} else {
				log.info("Documents deleted : " + event.body().getInteger("number"));
				promise.complete(null);
			}
		});
		return promise.future();
	}

	private Future<Void> deleteFromStorage(List<JsonObject> objects) {
		JsonArray fileIds = objects.stream().map(o -> o.getString("file")).collect(JsonArray::new, JsonArray::add,
				JsonArray::addAll);
		Promise<Void> promise = Promise.promise();
		storage.removeFiles(fileIds, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject event) {
				if (event == null) {
					log.error("Error deleting files ");
					promise.complete(null);
				} else if (!"ok".equals(event.getString("status"))) {
					log.error("Error deleting files : " + event.encode());
					promise.fail("Error deleting files : " + event.encode());
				}
			}
		});
		return promise.future();
	}

	@Override
	public void deleteUsers(JsonArray users) {
		if(users == null)
			return;

		for(int i = users.size(); i-- > 0;)
		{
			if(users.hasNull(i))
				users.remove(i);
			else if (users.getJsonObject(i) != null && users.getJsonObject(i).getString("id") == null)
				users.remove(i);
		}
		if(users.size() == 0)
			return;

		List<String> userIds = users.stream().map(u -> (JsonObject) u).map(u -> u.getString("id"))
				.collect(Collectors.toList());
		final JsonObject queryRacks = MongoQueryBuilder.build(in("to", userIds));
		find(queryRacks).compose(list -> {
			return CompositeFuture.all(deleteFromDB(queryRacks), deleteFromStorage(list));
		}).onComplete(e -> {
			if (e.succeeded()) {
				log.info("Rack.deleteUsers : Delete racks successfully");
			} else {
				log.error("Rack.deleteUsers : Delete racks failed");
			}
		});
	}

	private void createExportDirectory(String exportPath, String locale, final Handler<String> handler) {
		final String path = exportPath + File.separator
				+ I18n.getInstance().translate("rack.title", I18n.DEFAULT_DOMAIN, locale);
		vertx.fileSystem().mkdir(path, new Handler<AsyncResult<Void>>() {
			@Override
			public void handle(AsyncResult<Void> event) {
				if (event.succeeded()) {
					handler.handle(path);
				} else {
					handler.handle(null);
				}
			}
		});
	}

	private void exportFiles(final JsonObject alias, final String[] ids, String path, String locale, final AtomicBoolean exported, final Handler<Boolean> handler) {
		if (ids.length == 0) {
			handler.handle(true);
			return;
		}
		storage.writeToFileSystem(ids, path, alias, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject event) {
				if ("ok".equals(event.getString("status"))) {
					exported.set(true);
					handler.handle(exported.get());
				} else {
					JsonArray errors = event.getJsonArray("errors",
							new JsonArray());
					boolean ignoreErrors = errors.size() > 0;
					for (Object o : errors) {
						if (!(o instanceof JsonObject))
							continue;
						if (((JsonObject) o).getString("message") == null
								|| (!((JsonObject) o).getString("message").contains("NoSuchFileException")
										&& !((JsonObject) o).getString("message")
												.contains("FileAlreadyExistsException"))) {
							ignoreErrors = false;
							break;
						}
					}
					if (ignoreErrors) {
						exported.set(true);
						handler.handle(exported.get());
					} else {
						log.error("Write to fs : "
								+ new JsonArray(Arrays.asList(ids)).encode()
								+ " - " + event.encode());
						handler.handle(exported.get());
					}
				}
			}
		});
	}


	@Override
	public void exportResources(JsonArray resourcesIds, boolean exportDocuments, boolean exportSharedResources, String exportId, String userId,
								JsonArray g, String exportPath, String locale, String host, Handler<ExportResourceResult> handler)
	{
		Bson b = and(eq("to", userId), exists("file", true));

		JsonObject query;

		if(resourcesIds == null)
			query = MongoQueryBuilder.build(b);
		else
		{
			Bson limitToResources = and(b,
				in("_id", resourcesIds));
			query = MongoQueryBuilder.build(limitToResources);
		}

		final AtomicBoolean exported = new AtomicBoolean(false);
		final JsonObject keys = new JsonObject().put("file", 1).put("name", 1);

		mongo.find(Rack.RACK_COLLECTION, query, null, keys, new Handler<Message<JsonObject>>()
		{
			@Override
			public void handle(Message<JsonObject> event)
			{
				JsonArray racks = event.body().getJsonArray("results");
				if ("ok".equals(event.body().getString("status")) && racks != null)
				{
					final Set<String> usedFileName = new HashSet<>();
					final JsonObject alias = new JsonObject();
					final String[] ids = new String[racks.size()];

					for (int i = 0; i < racks.size(); i++)
					{
						JsonObject j = racks.getJsonObject(i);
						ids[i] = j.getString("file");
						String fileName = j.getString("name");
						if (fileName != null && fileName.contains("/"))
						{
							fileName = fileName.replaceAll("/", "-");
						}
						if (usedFileName.add(fileName))
						{
							alias.put(ids[i], fileName);
						}
						else
						{
							alias.put(ids[i], ids[i] + "_" + fileName);
						}
					}
					createExportDirectory(exportPath, locale, exportDirPath -> {
						if (exportDirPath == null) {
							log.error("Rack - Error creating export directory from path : " + exportPath);
							handler.handle(ExportResourceResult.KO);
						} else {
							exportFiles(alias, ids, exportDirPath, locale, exported, e -> handler.handle(new ExportResourceResult(e, exportDirPath)));
						}
					});
				}
				else
				{
					log.error("Rack " + query.encode() + " - " + event.body().getString("message"));
					handler.handle(new ExportResourceResult(exported.get(), exportPath));
				}
			}
		});
	}

	@Override
	public void importResources(String importId, String userId, String userLogin, String userName, String importPath,
		String locale, String host, boolean forceImportAsDuplication, Handler<JsonObject> handler)
	{
		boolean oldFormat = true;

		if(oldFormat == true)
		{
			FolderImporterContext context = new FolderImporterContext(importPath, userId, userName, true, "Import Casier");

			RackRepositoryEvent self = this;

			// Some files were exported without an id in their name, so we need to move them
			this.vertx.fileSystem().readDir(importPath, new Handler<AsyncResult<List<String>>>()
			{
				@Override
				public void handle(AsyncResult<List<String>> result)
				{
					if(result.succeeded() == false)
						throw new RuntimeException(result.cause());
					else
					{
						List<String> filesInDir = result.result();
						int nbFiles = filesInDir.size();

						List<Future> moves = new LinkedList<Future>();

						for(String filePath : filesInDir)
						{
							String name = FileUtils.getFilename(filePath);

							Matcher m = self.uuidPattern.matcher(name);
							if(m.find() == false)
							{
								String path = FileUtils.getPathWithoutFilename(filePath);
								String newName = UUID.randomUUID().toString() + "_" + name;

								Promise<Void> promise = Promise.promise();
								moves.add(promise.future());
								self.vertx.fileSystem().move(filePath, path + File.separator + newName, new Handler<AsyncResult<Void>>()
								{
									@Override
									public void handle(AsyncResult<Void> res)
									{
										if(res.succeeded() == true)
											promise.complete();
										else
											promise.fail(res.cause());
									}
								});
							}
						}

						CompositeFuture.join(moves).onComplete(new Handler<AsyncResult<CompositeFuture>>()
						{
							@Override
							public void handle(AsyncResult<CompositeFuture> res)
							{
								// We don't need to count errors, the FolderImporter will do it for us
								self.importer.importFoldersFlatFormat(context, new Handler<JsonObject>()
								{
									@Override
									public void handle(JsonObject res)
									{
										JsonObject idsMap = new JsonObject();

										for(Map.Entry<String, String> entry : context.oldIdsToNewIds.entrySet())
											idsMap.put(entry.getKey(), entry.getValue());

										res
											.put("resourcesIdsMap", new JsonObject()
												.put(Rack.RACK_COLLECTION, idsMap)
											)
											.put("duplicatesNumberMap", new JsonObject()
												.put(Rack.RACK_COLLECTION, res.getString("duplicatesNumber"))
											)
											.put("mainResourceName", Rack.RACK_COLLECTION);
										handler.handle(res);
									}
								});
							}
						});
					}
				}
			});
		}
		else
		{
			// TODO: pimp the export and import code
		}
	}

}
