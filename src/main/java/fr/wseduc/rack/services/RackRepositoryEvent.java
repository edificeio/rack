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

import org.entcore.common.storage.Storage;
import org.entcore.common.user.RepositoryEvents;
import org.entcore.common.folders.FolderImporter;
import org.entcore.common.folders.FolderImporter.FolderImporterContext;
import org.entcore.common.utils.StringUtils;
import org.entcore.common.utils.FileUtils;

import com.mongodb.QueryBuilder;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.mongodb.MongoQueryBuilder;
import fr.wseduc.rack.Rack;
import fr.wseduc.webutils.I18n;
import io.vertx.core.AsyncResult;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

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
		this.importer = new FolderImporter(vertx.fileSystem(), vertx.eventBus(), false);
	}

	@Override
	public void deleteGroups(JsonArray arg0) {
		// nothing to do
	}

	private Future<List<JsonObject>> find(JsonObject query) {
		Future<List<JsonObject>> future = Future.future();
		mongo.find(Rack.RACK_COLLECTION, query, null, new JsonObject().put("file", 1), res -> {
			String status = res.body().getString("status");
			JsonArray results = res.body().getJsonArray("results");
			if ("ok".equals(status) && results != null) {
				List<JsonObject> objects = results.stream().filter(o -> o instanceof JsonObject)
						.map(r -> (JsonObject) r).collect(Collectors.toList());
				future.complete(objects);
			} else {
				future.fail("could not found racks");
			}
		});
		return future;
	}

	private Future<Void> deleteFromDB(JsonObject query) {
		Future<Void> future = Future.future();
		mongo.delete(Rack.RACK_COLLECTION, query, event -> {
			if (!"ok".equals(event.body().getString("status"))) {
				log.error("Error deleting documents : " + event.body().encode());
				future.fail("Error deleting documents : " + event.body().encode());
			} else {
				log.info("Documents deleted : " + event.body().getInteger("number"));
				future.complete(null);
			}
		});
		return future;
	}

	private Future<Void> deleteFromStorage(List<JsonObject> objects) {
		JsonArray fileIds = objects.stream().map(o -> o.getString("file")).collect(JsonArray::new, JsonArray::add,
				JsonArray::addAll);
		Future<Void> future = Future.future();
		storage.removeFiles(fileIds, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject event) {
				if (event == null) {
					log.error("Error deleting files ");
					future.complete(null);
				} else if (!"ok".equals(event.getString("status"))) {
					log.error("Error deleting files : " + event.encode());
					future.fail("Error deleting files : " + event.encode());
				}
			}
		});
		return future;
	}

	@Override
	public void deleteUsers(JsonArray users) {
		List<String> userIds = users.stream().map(u -> (JsonObject) u).map(u -> u.getString("id"))
				.collect(Collectors.toList());
		final JsonObject queryRacks = MongoQueryBuilder.build(QueryBuilder.start("to").in(userIds));
		find(queryRacks).compose(list -> {
			return CompositeFuture.all(deleteFromDB(queryRacks), deleteFromStorage(list));
		}).setHandler(e -> {
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

	private void exportFiles(final JsonObject alias, final String[] ids, String exportPath, String locale,
			final AtomicBoolean exported, final Handler<Boolean> handler) {
		createExportDirectory(exportPath, locale, new Handler<String>() {
			@Override
			public void handle(String path) {
				if (path != null) {
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
										new fr.wseduc.webutils.collections.JsonArray());
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
											+ new fr.wseduc.webutils.collections.JsonArray(Arrays.asList(ids)).encode()
											+ " - " + event.encode());
									handler.handle(exported.get());
								}
							}
						}
					});
				} else {
					log.error("Create export directory error.");
					handler.handle(exported.get());
				}
			}
		});
	}

	@Override
	public void exportResources(JsonArray resourcesIds, String exportId, String userId, JsonArray g, String exportPath, String locale,
			String host, Handler<Boolean> handler)
	{
		QueryBuilder b = QueryBuilder.start("to").is(userId).put("file").exists(true);

		JsonObject query;

		if(resourcesIds == null)
			query = MongoQueryBuilder.build(b);
		else
		{
			QueryBuilder limitToResources = b.and(
				QueryBuilder.start("_id").in(resourcesIds).get()
			);
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

					exportFiles(alias, ids, exportPath, locale, exported, handler);
				}
				else
				{
					log.error("Rack " + query.encode() + " - " + event.body().getString("message"));
					handler.handle(exported.get());
				}
			}
		});
	}

	@Override
	public void importResources(String importId, String userId, String userLogin, String userName, String importPath,
		String locale, Handler<JsonObject> handler)
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

								Future<Void> f = Future.future();
								moves.add(f);
								self.vertx.fileSystem().move(filePath, path + File.separator + newName, new Handler<AsyncResult<Void>>()
								{
									@Override
									public void handle(AsyncResult<Void> res)
									{
										if(res.succeeded() == true)
											f.complete();
										else
											f.fail(res.cause());
									}
								});
							}
						}

						CompositeFuture.join(moves).setHandler(new Handler<AsyncResult<CompositeFuture>>()
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
											.put("idsMap", new JsonObject()
												.put(Rack.RACK_COLLECTION, idsMap))
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
