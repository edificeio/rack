package fr.wseduc.rack.controllers;

import static fr.wseduc.webutils.Utils.getOrElse;
import static org.entcore.common.http.response.DefaultResponseHandler.arrayResponseHandler;
import static org.entcore.common.http.response.DefaultResponseHandler.defaultResponseHandler;

import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.entcore.common.http.request.JsonHttpServerRequest;
import org.entcore.common.mongodb.MongoDbControllerHelper;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.vertx.java.core.Handler;
import org.vertx.java.core.Vertx;
import org.vertx.java.core.buffer.Buffer;
import org.vertx.java.core.eventbus.Message;
import org.vertx.java.core.http.HttpServerFileUpload;
import org.vertx.java.core.http.HttpServerRequest;
import org.vertx.java.core.http.RouteMatcher;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;
import org.vertx.java.core.logging.Logger;
import org.vertx.java.core.logging.impl.LoggerFactory;
import org.vertx.java.platform.Container;

import com.mongodb.QueryBuilder;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.mongodb.MongoQueryBuilder;
import fr.wseduc.rack.services.RackService;
import fr.wseduc.rack.services.RackServiceMongoImpl;
import fr.wseduc.rs.Delete;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.FileUtils;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.ETag;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.RequestUtils;

/**
 * Vert.x backend controller for the application using Mongodb.
 */
public class RackController extends MongoDbControllerHelper {

	//Computation service
	private final RackService rackService;
	private final String gridfsAddress;
	private final String collection;
	private int threshold;
	private String imageResizerAddress;
	private TimelineHelper timelineHelper;

	private final static String QUOTA_BUS_ADDRESS = "org.entcore.workspace.quota";
	private final static String WORKSPACE_NAME = "WORKSPACE";
	private final static String WORKSPACE_COLLECTION ="documents";
	private final static String NOTIFICATION_TYPE = "RACK";
	private final static Logger logger = LoggerFactory.getLogger(RackController.class);

	//Permissions
	private static final String
		access	 			= "rack.access",
		send				= "rack.send.document",
		list				= "rack.list.documents",
		list_users			= "rack.list.users",
		list_groups			= "rack.list.groups",
		workspacecopy		= "rack.copy.to.workspace",
		owner				= "rack.document.owner";

	/**
	 * Creates a new controller.
	 * @param collection Name of the collection stored in the mongoDB database.
	 */
	public RackController(String collection, String gridfsAddress) {
		super(collection);
		this.collection = collection;
		this.gridfsAddress = gridfsAddress;
		rackService = new RackServiceMongoImpl(collection);
	}

	@Override
	public void init(Vertx vertx, Container container, RouteMatcher rm, Map<String, fr.wseduc.webutils.security.SecuredAction> securedActions) {
		super.init(vertx, container, rm, securedActions);
		this.threshold = container.config().getInteger("alertStorage", 80);
		this.imageResizerAddress = container.config().getString("image-resizer-address", "wse.image.resizer");
		this.timelineHelper = new TimelineHelper(vertx, eb, container);
	}

	/**
	 * Displays the home view.
	 * @param request Client request
	 */
	@Get("")
	@SecuredAction(access)
	public void view(HttpServerRequest request) {
		renderView(request);
	}

	//////////////
	//// CRUD ////
	//////////////

	/**
	 * Post a new document to other people's rack folder.
	 * @param request Client request containing a list of user ids belonging to the receivers & the file.
	 */
	@Post("")
	@SecuredAction(send)
	public void postRack(final HttpServerRequest request){
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			public void handle(final UserInfos userInfos) {

				if (userInfos == null) {
					badRequest(request);
					return;
				}

				request.expectMultiPart(true);
				final Buffer fileBuffer = new Buffer();
				final JsonObject save = new JsonObject();
				final JsonObject metadata = new JsonObject();

				/* Upload file */
				request.uploadHandler(new Handler<HttpServerFileUpload>() {
					public void handle(final HttpServerFileUpload upload) {
						upload.dataHandler(new Handler<Buffer>() {
							@Override
							public void handle(Buffer data) {
								fileBuffer.appendBuffer(data);
							}
						});
						upload.endHandler(new Handler<Void>() {
							public void handle(Void v) {
								save.putString("action", "save");
								save.putString("content-type", upload.contentType());
								save.putString("filename", upload.filename());
								metadata.putString("name", upload.name());
								metadata.putString("filename", upload.filename());
								metadata.putString("content-type", upload.contentType());
								metadata.putString("content-transfer-encoding", upload.contentTransferEncoding());
								metadata.putString("charset", upload.charset().name());
								metadata.putNumber("size", upload.size());
								if (metadata.getLong("size", 0l).equals(0l)) {
									metadata.putNumber("size", fileBuffer.length());
								}
								byte [] header = null;
								try {
									header = save.toString().getBytes("UTF-8");
								} catch (UnsupportedEncodingException e) {
									badRequest(request, e.getMessage());
								}
								if(header != null){
									fileBuffer.appendBytes(header).appendInt(header.length);
								}
							}
						});
					}
				});

				/* After upload */
				request.endHandler(new Handler<Void>() {
					public void handle(Void v) {
						String users = request.formAttributes().get("users");
						if(users == null){
							badRequest(request);
							return;
						}

						String[] userIds = users.split(",");

						final AtomicInteger countdown = new AtomicInteger(userIds.length);
						final AtomicInteger success = new AtomicInteger(0);
						final AtomicInteger failure = new AtomicInteger(0);

						/* Final handler - called after each attempt */
						final Handler<Boolean> finalHandler = new Handler<Boolean>() {
							public void handle(Boolean event) {
								if(event == null || !event)
									failure.addAndGet(1);
								else
									success.addAndGet(1);
								if(countdown.decrementAndGet() == 0){
									JsonObject result = new JsonObject();
									result.putNumber("success", success.get());
									result.putNumber("failure", failure.get());
									renderJson(request, result);
								}
							}
						};

						for(final String to : userIds){
							/* Query user and check existence */
							String query =
									"MATCH (n:User) " +
									"WHERE n.id = {id} " +
									"RETURN count(n) as nb, n.displayName as username";
							Map<String, Object> params = new HashMap<>();
							params.put("id", to);

							Handler<Message<JsonObject>> existenceHandler = new Handler<Message<JsonObject>>(){
								public void handle(Message<JsonObject> res) {
									JsonArray result = res.body().getArray("result");

									if (!"ok".equals(res.body().getString("status")) ||
											1 != result.size() ||
											1 != result.<JsonObject>get(0).getInteger("nb")) {
										finalHandler.handle(false);
										return;
									}

									/* Pre write rack document fields */
									final JsonObject doc = new JsonObject();
									doc.putString("to", to);
									doc.putString("toName", result.<JsonObject>get(0).getString("username"));
									doc.putString("from", userInfos.getUserId());
									doc.putString("fromName", userInfos.getUsername());
									String now = MongoDb.formatDate(new Date());
									doc.putString("sent", now);

									/* Rack collection saving */
									final Handler<Message<JsonObject>> rackSaveHandler = new Handler<Message<JsonObject>>() {
										@Override
										public void handle(Message<JsonObject> uploaded) {
											addAfterUpload(uploaded.body().putObject("metadata", metadata),
													doc,
													request.params().get("name"),
													request.params().get("application"),
													request.params().getAll("thumbnail"),
													new Handler<Message<JsonObject>>() {
														public void handle(Message<JsonObject> res) {
															if ("ok".equals(res.body().getString("status"))) {
																JsonObject params = new JsonObject()
																	.putString("uri", "/userbook/annuaire#" + doc.getString("from"))
																	.putString("username", doc.getString("fromName"))
																	.putString("documentName", doc.getString("name"));
																List<String> receivers = new ArrayList<>();
																receivers.add(doc.getString("to"));
																timelineHelper.notifyTimeline(request,
																		userInfos,
																		NOTIFICATION_TYPE,
																		NOTIFICATION_TYPE + "_POST",
																		receivers,
																		userInfos.getUserId() + System.currentTimeMillis() + "postrack",
																		"notify-rack-post.html", params);
																finalHandler.handle(true);
															} else {
																finalHandler.handle(false);
															}
														}
													});
										}
									};

									/* Get user quota & check */
									getUserQuota(to, new Handler<JsonObject>() {
										public void handle(JsonObject j) {
											if(j == null || "error".equals(j.getString("status"))){
												finalHandler.handle(false);
												return;
											}

											long emptySize = 0l;
											long quota = j.getLong("quota", 0l);
											long storage = j.getLong("storage", 0l);
											emptySize = quota - storage;
											if (emptySize < metadata.getLong("size", 0l)) {
												finalHandler.handle(false);
												return;
											}
											//Save file in gridfs
											eb.send("wse.gridfs.persistor", fileBuffer, rackSaveHandler);
										}
									});

								}
							};
							Neo4j.getInstance().execute(query, params, existenceHandler);
						}
					}
				});
			}
		});
	}

	/**
	 * Delete a document from the user rack.
	 * @param request Request containing the id of the document to delete.
	 */
	@Delete("/:id")
	@SecuredAction(value = owner, type = ActionType.RESOURCE)
	public void deleteRackDocument(final HttpServerRequest request) {
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			public void handle(UserInfos user) {
				if (user != null && user.getUserId() != null) {
					deleteFile(request, user.getUserId());
				} else {
					unauthorized(request);
				}
			}
		});
	}

	/**
	 * Returns a rack document.
	 * @param request Client request containing the id of the document.
	 */
	@Get("/get/:id")
	@SecuredAction(value = owner, type = ActionType.RESOURCE)
	public void getRack(final HttpServerRequest request) {
		final String thumbSize = request.params().get("thumbnail");
		final String id = request.params().get("id");
		rackService.getRack(id, new Handler<Either<String,JsonObject>>() {
			public void handle(Either<String, JsonObject> event) {
				if(event.isRight()){
					JsonObject result = event.right().getValue();
					String file;

					if (thumbSize != null && !thumbSize.trim().isEmpty()) {
						file = result.getObject("thumbnails", new JsonObject())
								.getString(thumbSize, result.getString("file"));
					} else {
						file = result.getString("file");
					}

					if (file != null && !file.trim().isEmpty()) {
						boolean inline = inlineDocumentResponse(result, request.params().get("application"));
						if (inline && ETag.check(request, file)) {
							notModified(request, file);
						} else {
							FileUtils.gridfsSendFile(file,
									result.getString("name"), eb, gridfsAddress, request.response(),
									inline, result.getObject("metadata"));
						}
					} else {
						notFound(request);
						request.response().setStatusCode(404).end();
					}

				} else {
					JsonObject error = new JsonObject().putString("error", event.left().getValue());
					Renders.renderJson(request, error, 400);
				}
			}
		});
	}

	/**
	 * Lists every document associated with the user.
	 * @param request Client request.
	 */
	@Get("/list")
	@SecuredAction(value = list)
	public void listRack(final HttpServerRequest request) {
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			public void handle(final UserInfos user) {
				if (user != null) {
					Handler<Either<String, JsonArray>> handler = arrayResponseHandler(request);
					rackService.listRack(user, handler);
				}
			}
		});
	}

	///////////////////
	//// TRASH BIN ////
	///////////////////

	/**
	 * Puts a document into the trash bin.
	 * @param request Client request containing the id.
	 */
	@Put("/:id/trash")
	@SecuredAction(value = owner, type = ActionType.RESOURCE)
	public void trashRack(final HttpServerRequest request) {
		final String id = request.params().get("id");
		rackService.trashRack(id, defaultResponseHandler(request));
	}

	/**
	 * Recovers a document from the trash bin.
	 * @param request Client request containing the id.
	 */
	@Put("/:id/recover")
	@SecuredAction(value = owner, type = ActionType.RESOURCE)
	public void recoverRack(final HttpServerRequest request) {
		final String id = request.params().get("id");
		rackService.recoverRack(id, defaultResponseHandler(request));
	}

	/* File serving */

	private boolean inlineDocumentResponse(JsonObject doc, String application) {
		JsonObject metadata = doc.getObject("metadata");
		String storeApplication = doc.getString("application");
		return metadata != null && !"WORKSPACE".equals(storeApplication) && (
				"image/jpeg".equals(metadata.getString("content-type")) ||
				"image/gif".equals(metadata.getString("content-type")) ||
				"image/png".equals(metadata.getString("content-type")) ||
				"image/tiff".equals(metadata.getString("content-type")) ||
				"image/vnd.microsoft.icon".equals(metadata.getString("content-type")) ||
				"image/svg+xml".equals(metadata.getString("content-type")) ||
				("application/octet-stream".equals(metadata.getString("content-type")) && application != null)
			);
	}

	/* Userlist & Grouplist */

	private void getVisibleRackUsers(final HttpServerRequest request, final Handler<JsonArray> handler){
		String customReturn =
				"MATCH visibles-[:IN]->(g:ProfileGroup) " +
				"MATCH visibles-[:IN]->(:ProfileGroup)-[:AUTHORIZED]->(:Role)-[:AUTHORIZE]->(a:Action) " +
				"WHERE has(a.name) AND a.name={action} AND NOT has(visibles.activationCode) " +
				"RETURN distinct visibles.id as id, visibles.displayName as username, visibles.lastName as name, collect(DISTINCT {name: g.name, id: g.id, groupDisplayName: g.groupDisplayName}) as groups " +
				"ORDER BY name ";
		JsonObject params = new JsonObject().putString("action", "fr.wseduc.rack.controllers.RackController|listRack");
		UserUtils.findVisibleUsers(eb, request, false, customReturn, params, new Handler<JsonArray>() {
			@Override
			public void handle(JsonArray users) {
				for (Object u : users) {
					if (!(u instanceof JsonObject)) continue;
					JsonObject user = (JsonObject) u;
					JsonArray userGroups = user.getArray("groups");
					for(Object g : userGroups){
						if (!(g instanceof JsonObject)) continue;
						JsonObject group = (JsonObject) g;
						if(group.getString("name") == null) continue;
						UserUtils.groupDisplayName(group, I18n.acceptLanguage(request));
					}
				}
				handler.handle(users);
			}
		});
	}

	private void getVisibleRackGroups(final HttpServerRequest request, final Handler<JsonArray> handler){
		UserUtils.findVisibleProfilsGroups(eb, request, new Handler<JsonArray>() {
			public void handle(JsonArray groups) {
				handler.handle(groups);
			}
		});
	}

	/**
	 * Lists the users to which the user can post documents.
	 * @param request Client request
	 */
	@Get("/users/available")
	@SecuredAction(list_users)
	public void listUsers(final HttpServerRequest request) {
		getVisibleRackUsers(request, new Handler<JsonArray>() {
			public void handle(JsonArray users) {
				renderJson(request, users);
			}
		});
	}

	/**
	 * Lists the users to which the user can post documents.
	 * @param request Client request
	 */
	@Get("/groups/available")
	@SecuredAction(list_groups)
	public void listGroups(final HttpServerRequest request) {
		getVisibleRackGroups(request, new Handler<JsonArray>() {
			public void handle(JsonArray users) {
				renderJson(request, users);
			}
		});
	}

	/* Quota bus communication & utilities */

	private void getUserQuota(String userId, final Handler<JsonObject> handler){
		JsonObject message = new JsonObject();
		message.putString("action", "getUserQuota");
		message.putString("userId", userId);

		eb.send(QUOTA_BUS_ADDRESS, message, new Handler<Message<JsonObject>>() {
			public void handle(Message<JsonObject> reply) {
				handler.handle(reply.body());
			}
		});
	}

	private void updateUserQuota(final String userId, long size){
		JsonObject message = new JsonObject();
		message.putString("action", "updateUserQuota");
		message.putString("userId", userId);
		message.putNumber("size", size);
		message.putNumber("threshold", threshold);

		eb.send(QUOTA_BUS_ADDRESS, message, new Handler<Message<JsonObject>>() {
			public void handle(Message<JsonObject> reply) {
				JsonObject obj = reply.body();
				UserUtils.addSessionAttribute(eb, userId, "storage", obj.getLong("storage"), null);
				if (obj.getBoolean("notify", false)) {
					notifyEmptySpaceIsSmall(userId);
				}
			}
		});

	}

	private void notifyEmptySpaceIsSmall(String userId) {
		List<String> recipients = new ArrayList<>();
		recipients.add(userId);
		notification.notifyTimeline(new JsonHttpServerRequest(new JsonObject()), null, WORKSPACE_NAME,
				WORKSPACE_NAME + "_STORAGE", recipients, null, "notify-storage.html", null);
	}

	private void emptySize(final UserInfos userInfos, final Handler<Long> emptySizeHandler) {
		try {
			long quota = Long.valueOf(userInfos.getAttribute("quota").toString());
			long storage = Long.valueOf(userInfos.getAttribute("storage").toString());
			emptySizeHandler.handle(quota - storage);
		} catch (Exception e) {
			getUserQuota(userInfos.getUserId(), new Handler<JsonObject>() {
				@Override
				public void handle(JsonObject j) {
					long quota = j.getLong("quota", 0l);
					long storage = j.getLong("storage", 0l);
					for (String attr : j.getFieldNames()) {
						UserUtils.addSessionAttribute(eb, userInfos.getUserId(), attr, j.getLong(attr), null);
					}
					emptySizeHandler.handle(quota - storage);
				}
			});
		}
	}

	/* File operations */

	/**
	 * Copy a document from the rack to the workspace.
	 * @param request Client request with file ids & destination folder (optional) in the body using json format.
	 */
	@Post("/copy")
	@SecuredAction(workspacecopy)
	public void rackToWorkspace(final HttpServerRequest request){
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			public void handle(final UserInfos user) {
				if(user != null){
					RequestUtils.bodyToJson(request, pathPrefix + "rackToWorkspace", new Handler<JsonObject>(){
						public void handle(JsonObject json) {
							JsonArray idsArray = json.getArray("ids");
							final String folder = json.getString("folder", "");
							copyFiles(request, idsArray, folder, user, WORKSPACE_COLLECTION);
						}
					});
				} else {
					badRequest(request);
				}
			}
		});
	}

	private void copyFiles(final HttpServerRequest request, final JsonArray idsArray, final String folder, final UserInfos user, final String destinationCollection) {

		String criteria = "{ \"_id\" : { \"$in\" : " + idsArray.encode() + "}";
		criteria += ", \"to\" : \"" + user.getUserId() + "\" }";

		mongo.find(collection, new JsonObject(criteria), new Handler<Message<JsonObject>>() {

			private void persist(final JsonArray insert, int remains) {
				if (remains == 0) {
					mongo.insert(destinationCollection, insert, new Handler<Message<JsonObject>>() {
						@Override
						public void handle(Message<JsonObject> inserted) {
							if ("ok".equals(inserted.body().getString("status"))){
								/* Increment quota */
								long totalSize = 0l;
								for(Object insertion : insert){
									JsonObject added = (JsonObject) insertion;
									totalSize +=  added.getObject("metadata", new JsonObject()).getLong("size", 0l);
								}
								updateUserQuota(user.getUserId(), totalSize);
								renderJson(request, inserted.body());
							} else {
								renderError(request, inserted.body());
							}
						}
					});
				}
			}

			public void handle(Message<JsonObject> r) {
				JsonObject src = r.body();
				if ("ok".equals(src.getString("status")) && src.getArray("results") != null) {
					final JsonArray origs = src.getArray("results");
					final JsonArray insert = new JsonArray();
					final AtomicInteger number = new AtomicInteger(origs.size());

					emptySize(user, new Handler<Long>() {

						public void handle(Long emptySize) {
							long size = 0;

							/* Get total file size */
							for (Object o: origs) {
								if (!(o instanceof JsonObject)) continue;
								JsonObject metadata = ((JsonObject) o).getObject("metadata");
								if (metadata != null) {
									size += metadata.getLong("size", 0l);
								}
							}
							/* If total file size is too big (> quota left) */
							if (size > emptySize) {
								badRequest(request, "files.too.large");
								return;
							}

							/* Process */
							for (Object o: origs) {
								JsonObject orig = (JsonObject) o;
								final JsonObject dest = orig.copy();
								String now = MongoDb.formatDate(new Date());
								dest.removeField("_id");
								dest.removeField("protected");
								dest.removeField("comments");
								dest.putString("application", WORKSPACE_NAME);

								dest.putString("owner", user.getUserId());
								dest.putString("ownerName", dest.getString("toName"));
								dest.removeField("to");
								dest.removeField("from");
								dest.removeField("toName");
								dest.removeField("fromName");

								dest.putString("created", now);
								dest.putString("modified", now);
								if (folder != null && !folder.trim().isEmpty()) {
									dest.putString("folder", folder);
								} else {
									dest.removeField("folder");
								}
								insert.add(dest);
								final String filePath = orig.getString("file");

								if(folder != null && !folder.trim().isEmpty()){

									//If the document has a new parent folder, replicate sharing rights
									String parentName, parentFolder;
									if(folder.lastIndexOf('_') < 0){
										parentName = folder;
										parentFolder = folder;
									} else if(filePath != null){
										String[] splittedPath = folder.split("_");
										parentName = splittedPath[splittedPath.length - 1];
										parentFolder = folder;
									} else {
										String[] splittedPath = folder.split("_");
										parentName = splittedPath[splittedPath.length - 2];
										parentFolder = folder.substring(0, folder.lastIndexOf("_"));
									}

									QueryBuilder parentFolderQuery = QueryBuilder.start("owner").is(user.getUserId())
											.and("folder").is(parentFolder)
											.and("name").is(parentName);

									mongo.findOne(collection,  MongoQueryBuilder.build(parentFolderQuery), new Handler<Message<JsonObject>>(){
										@Override
										public void handle(Message<JsonObject> event) {
											if ("ok".equals(event.body().getString("status"))){
												JsonObject parent = event.body().getObject("result");
												if(parent != null && parent.getArray("shared") != null && parent.getArray("shared").size() > 0)
													dest.putArray("shared", parent.getArray("shared"));

												if (filePath != null) {
													FileUtils.gridfsCopyFile(filePath, eb, gridfsAddress, new Handler<JsonObject>() {
														@Override
														public void handle(JsonObject event) {
															if (event != null && "ok".equals(event.getString("status"))) {
																dest.putString("file", event.getString("_id"));
																persist(insert, number.decrementAndGet());
															}
														}
													});
												} else {
													persist(insert, number.decrementAndGet());
												}
											} else {
												renderJson(request, event.body(), 404);
											}
										}
									});

								} else if (filePath != null) {
									FileUtils.gridfsCopyFile(filePath, eb, gridfsAddress, new Handler<JsonObject>() {

										@Override
										public void handle(JsonObject event) {
											if (event != null && "ok".equals(event.getString("status"))) {
												dest.putString("file", event.getString("_id"));
												persist(insert, number.decrementAndGet());
											}
										}
									});
								} else {
									persist(insert, number.decrementAndGet());
								}
							}
						}
					});
				} else {
					notFound(request, src.toString());
				}
			}
		});

}

	private void deleteFile(final HttpServerRequest request, final String owner) {
		final String id = request.params().get("id");
		rackService.getRack(id, new Handler<Either<String,JsonObject>>() {
			public void handle(Either<String, JsonObject> event) {
				if(event.isRight()){
					final JsonObject result = event.right().getValue();

					String file = result.getString("file");
					Set<Entry<String, Object>> thumbnails = new HashSet<Entry<String, Object>>();
					if(result.containsField("thumbnails")){
						thumbnails = result.getObject("thumbnails").toMap().entrySet();
					}

					FileUtils.gridfsRemoveFile(file, eb, gridfsAddress, new Handler<JsonObject>() {
						public void handle(JsonObject event) {
							if (event != null && "ok".equals(event.getString("status"))) {
									rackService.deleteRack(id, new Handler<Either<String,JsonObject>>() {
										public void handle(Either<String, JsonObject> deletionEvent) {
											if(deletionEvent.isRight()){
												JsonObject deletionResult = deletionEvent.right().getValue();
												long size = -1l * result.getObject("metadata", new JsonObject()).getLong("size", 0l);
												updateUserQuota(owner, size);
												renderJson(request, deletionResult, 204);
											} else {
												badRequest(request, deletionEvent.left().getValue());
											}
										}
									});
							} else {
								renderError(request, event);
							}
						}
					});

					//Delete thumbnails
					for(final Entry<String, Object> thumbnail : thumbnails){
						FileUtils.gridfsRemoveFile(thumbnail.getValue().toString(), eb, gridfsAddress, new Handler<JsonObject>(){
							public void handle(JsonObject event) {
								if (event == null || !"ok".equals(event.getString("status"))) {
									logger.error("[gridfsRemoveFile] Error while deleting thumbnail "+thumbnail);
								}
							}
						});
					}

				} else {
					JsonObject error = new JsonObject().putString("error", event.left().getValue());
					Renders.renderJson(request, error, 400);
				}
			}
		});
	}

	private void addAfterUpload(final JsonObject uploaded, final JsonObject doc, String name, String application, final List<String> thumbs, final Handler<Message<JsonObject>> handler) {
		//Write additional fields in the document
		doc.putString("name", getOrElse(name, uploaded.getObject("metadata").getString("filename"), false));
		doc.putObject("metadata", uploaded.getObject("metadata"));
		doc.putString("file", uploaded.getString("_id"));
		doc.putString("application", getOrElse(application, WORKSPACE_NAME));
		//Save document to mongo
		mongo.save(collection, doc, new Handler<Message<JsonObject>>() {
			public void handle(Message<JsonObject> res) {
				if ("ok".equals(res.body().getString("status"))) {
					Long size = doc.getObject("metadata", new JsonObject()).getLong("size", 0l);
					updateUserQuota(doc.getString("to"), size);
					createThumbnailIfNeeded(collection, uploaded, res.body().getString("_id"), null, thumbs);
				}
				if (handler != null) {
					handler.handle(res);
				}
			}
		});
	}

	private void createThumbnailIfNeeded(final String collection, JsonObject srcFile, final String documentId, JsonObject oldThumbnail, List<String> thumbs) {
		if (documentId != null && thumbs != null && !documentId.trim().isEmpty() && !thumbs.isEmpty() &&
				srcFile != null && isImage(srcFile) && srcFile.getString("_id") != null) {
			Pattern size = Pattern.compile("([0-9]+)x([0-9]+)");
			JsonArray outputs = new JsonArray();
			for (String thumb: thumbs) {
				Matcher m = size.matcher(thumb);
				if (m.matches()) {
					try {
						int width = Integer.parseInt(m.group(1));
						int height = Integer.parseInt(m.group(2));
						if (width == 0 && height == 0) continue;
						JsonObject j = new JsonObject().putString("dest", "gridfs://fs");
						if (width != 0) {
							j.putNumber("width", width);
						}
						if (height != 0) {
							j.putNumber("height", height);
						}
						outputs.addObject(j);
					} catch (NumberFormatException e) {
						log.error("Invalid thumbnail size.", e);
					}
				}
			}
			if (outputs.size() > 0) {
				JsonObject json = new JsonObject()
						.putString("action", "resizeMultiple")
						.putString("src", "gridfs://fs:" + srcFile.getString("_id"))
						.putArray("destinations", outputs);
				eb.send(imageResizerAddress, json, new Handler<Message<JsonObject>>() {
					@Override
					public void handle(Message<JsonObject> event) {
						JsonObject thumbnails = event.body().getObject("outputs");
						if ("ok".equals(event.body().getString("status")) && thumbnails != null) {
							mongo.update(collection, new JsonObject().putString("_id", documentId),
									new JsonObject().putObject("$set", new JsonObject()
											.putObject("thumbnails", thumbnails)));
						}
				   }
				});
			}
		}
		if (oldThumbnail != null) {
			for (String attr: oldThumbnail.getFieldNames()) {
				FileUtils.gridfsRemoveFile(oldThumbnail.getString(attr), eb, gridfsAddress, null);
			}
		}
	}

	private boolean isImage(JsonObject doc) {
		if (doc == null) {
			return false;
		}
		JsonObject metadata = doc.getObject("metadata");
		return metadata != null && (
				"image/jpeg".equals(metadata.getString("content-type")) ||
				"image/gif".equals(metadata.getString("content-type"))  ||
				"image/png".equals(metadata.getString("content-type"))  ||
				"image/tiff".equals(metadata.getString("content-type"))
		);
	}

}
