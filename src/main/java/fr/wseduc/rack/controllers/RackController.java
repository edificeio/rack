/*
 * Copyright © "Open Digital Education" (SAS “WebServices pour l’Education”), 2014
 *
 * This program is published by "Open Digital Education" (SAS “WebServices pour l’Education”).
 * You must indicate the name of the software and the company in any production /contribution
 * using the software and indicate on the home page of the software industry in question,
 * "powered by Open Digital Education" with a reference to the website: https: //opendigitaleducation.com/.
 *
 * This program is free software, licensed under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3 of the License.
 *
 * You can redistribute this application and/or modify it since you respect the terms of the GNU Affero General Public License.
 * If you modify the source code and then use this modified source code in your creation, you must make available the source code of your modifications.
 *
 * You should have received a copy of the GNU Affero General Public License along with the software.
 * If not, please see : <http://www.gnu.org/licenses/>. Full compliance requires reading the terms of this license and following its directives.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

package fr.wseduc.rack.controllers;

import com.mongodb.QueryBuilder;
import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.mongodb.MongoQueryBuilder;
import fr.wseduc.rack.Rack;
import fr.wseduc.rack.services.RackService;
import fr.wseduc.rack.services.RackServiceMongoImpl;
import fr.wseduc.rs.Delete;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.ETag;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.RequestUtils;
import io.vertx.core.AsyncResult;
import io.vertx.core.Handler;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.Message;
import io.vertx.core.http.HttpServerFileUpload;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.request.JsonHttpServerRequest;
import org.entcore.common.mongodb.MongoDbControllerHelper;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.storage.Storage;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.vertx.java.core.http.RouteMatcher;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.Map.Entry;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static fr.wseduc.webutils.Utils.getOrElse;
import static org.entcore.common.http.response.DefaultResponseHandler.arrayResponseHandler;
import static org.entcore.common.http.response.DefaultResponseHandler.defaultResponseHandler;
import static org.entcore.common.user.UserUtils.findVisibleUsers;

/**
 * Vert.x backend controller for the application using Mongodb.
 */
public class RackController extends MongoDbControllerHelper {

	//Computation service
	private final RackService rackService;
	private final String collection;
	private int threshold;
	private String imageResizerAddress;
	private TimelineHelper timelineHelper;
	private final Storage storage;

	private final static String QUOTA_BUS_ADDRESS = "org.entcore.workspace.quota";
	private final static String WORKSPACE_NAME = "WORKSPACE";
	private final static String WORKSPACE_COLLECTION ="documents";
	private final static Logger logger = LoggerFactory.getLogger(RackController.class);

	private final DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mmZ");

	//Statistics
	private EventStore eventStore;
	private enum RackEvent { ACCESS }

	//Permissions
	private static final String
		access	 			= "rack.access",
		send				= "rack.send.document",
		list				= "rack.list.documents",
		list_users			= "rack.list.users",
		list_groups			= "rack.list.groups",
		workspacecopy		= "rack.copy.to.workspace",
		owner				= "";

	/**
	 * Creates a new controller.
	 * @param collection Name of the collection stored in the mongoDB database.
	 */
	public RackController(String collection, Storage storage) {
		super(collection);
		this.collection = collection;
		this.storage = storage;
		rackService = new RackServiceMongoImpl(collection);
	}

	@Override
	public void init(Vertx vertx, JsonObject config, RouteMatcher rm, Map<String, fr.wseduc.webutils.security.SecuredAction> securedActions) {
		super.init(vertx, config, rm, securedActions);
		this.threshold = config.getInteger("alertStorage", 80);
		this.imageResizerAddress = config.getString("image-resizer-address", "wse.image.resizer");
		this.timelineHelper = new TimelineHelper(vertx, eb, config);
		this.eventStore = EventStoreFactory.getFactory().getEventStore(Rack.class.getSimpleName());
	}

	/**
	 * Displays the home view.
	 * @param request Client request
	 */
	@Get("")
	@SecuredAction(access)
	public void view(HttpServerRequest request) {
		renderView(request);
		eventStore.createAndStoreEvent(RackEvent.ACCESS.name(), request);
	}

	//////////////
	//// CRUD ////
	//////////////

	/**
	 * Post a new document to other people's rack folder.
	 * @param request Client request containing a list of user ids belonging to the receivers and the file.
	 */
	@Post("")
	@SecuredAction(send)
	public void postRack(final HttpServerRequest request){
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos userInfos) {

				if (userInfos == null) {
					badRequest(request);
					return;
				}

				request.setExpectMultipart(true);
				final Buffer fileBuffer = Buffer.buffer();
				final JsonObject metadata = new JsonObject();

				/* Upload file */
				request.uploadHandler(getUploadHandler(fileBuffer, metadata, request));

				/* After upload */
				request.endHandler(new Handler<Void>() {
					@Override
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
							@Override
							public void handle(Boolean event) {
								if(event == null || !event)
									failure.addAndGet(1);
								else
									success.addAndGet(1);
								if(countdown.decrementAndGet() == 0){
									JsonObject result = new JsonObject();
									result.put("success", success.get());
									result.put("failure", failure.get());
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
								@Override
								public void handle(Message<JsonObject> res) {
									JsonArray result = res.body().getJsonArray("result");

									if (!"ok".equals(res.body().getString("status")) ||
											1 != result.size() ||
											1 != result.getJsonObject(0).getInteger("nb")) {
										finalHandler.handle(false);
										return;
									}

									/* Pre write rack document fields */
									final JsonObject doc = new JsonObject();
									doc.put("to", to);
									doc.put("toName", result.getJsonObject(0).getString("username"));
									doc.put("from", userInfos.getUserId());
									doc.put("fromName", userInfos.getUsername());
									String now = dateFormat.format(new Date());
									doc.put("sent", now);

									/* Rack collection saving */
									final Handler<JsonObject> rackSaveHandler = new Handler<JsonObject>() {
										@Override
										public void handle(JsonObject uploaded) {
											if (uploaded == null || !"ok".equals(uploaded.getString("status"))) {
												finalHandler.handle(false);
											} else {
												addAfterUpload(uploaded.put("metadata", metadata),
														doc,
														request.params().get("name"),
														request.params().get("application"),
														request.params().getAll("thumbnail"),
														new Handler<Message<JsonObject>>() {
															@Override
															public void handle(Message<JsonObject> res) {
																if ("ok".equals(res.body().getString("status"))) {
																	JsonObject params = new JsonObject()
																		.put("uri", "/userbook/annuaire#" + doc.getString("from"))
																		.put("resourceUri", pathPrefix)
																		.put("username", doc.getString("fromName"))
																		.put("documentName", doc.getString("name"));
																	List<String> receivers = new ArrayList<>();
																	receivers.add(doc.getString("to"));
																	timelineHelper.notifyTimeline(request,
																			"rack.rack-post", userInfos, receivers,
																			userInfos.getUserId() + System.currentTimeMillis() + "postrack", null, params, true);
																	finalHandler.handle(true);
																} else {
																	finalHandler.handle(false);
																}
															}
														});
											}
										}
									};

									/* Get user quota & check */
									getUserQuota(to, new Handler<JsonObject>() {
										@Override
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
											//Save file
											RackController.this.storage.writeBuffer(fileBuffer, metadata.getString("content-type"), metadata.getString("name"), rackSaveHandler);
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

	private Handler<HttpServerFileUpload> getUploadHandler(final Buffer fileBuffer, final JsonObject metadata, final HttpServerRequest request) {
		return new Handler<HttpServerFileUpload>() {
            @Override
            public void handle(final HttpServerFileUpload upload) {
                upload.handler(new Handler<Buffer>() {
                    @Override
                    public void handle(Buffer data) {
                        fileBuffer.appendBuffer(data);
                    }
                });
                upload.endHandler(new Handler<Void>() {
                    @Override
                    public void handle(Void v) {
                        metadata.put("name", upload.name());
                        metadata.put("filename", upload.filename());
                        metadata.put("content-type", upload.contentType());
                        metadata.put("content-transfer-encoding", upload.contentTransferEncoding());
                        metadata.put("charset", upload.charset());
                        metadata.put("size", upload.size());
                        if (metadata.getLong("size", 0l).equals(0l)) {
                            metadata.put("size", fileBuffer.length());
                        }

						if (storage.getValidator() != null) {
                            request.pause();
                            storage.getValidator().process(metadata, new JsonObject(), new Handler<AsyncResult<Void>>() {
                                @Override
                                public void handle(AsyncResult<Void> voidAsyncResult) {
                                    if (voidAsyncResult.succeeded()) {
                                        request.resume();
                                    } else {
                                        badRequest(request, voidAsyncResult.cause().getMessage());
                                        return;
                                    }
                                }
                            });
                        }
                    }
                });
            }
        };
	}

	/**
	 * Delete a document from the user rack.
	 * @param request Request containing the id of the document to delete.
	 */
	@Delete("/:id")
	@SecuredAction(value = owner, type = ActionType.RESOURCE)
	public void deleteRackDocument(final HttpServerRequest request) {
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
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
			@Override
			public void handle(Either<String, JsonObject> event) {
				if(event.isRight()){
					JsonObject result = event.right().getValue();
					String file;

					if (thumbSize != null && !thumbSize.trim().isEmpty()) {
						file = result.getJsonObject("thumbnails", new JsonObject())
								.getString(thumbSize, result.getString("file"));
					} else {
						file = result.getString("file");
					}

					if (file != null && !file.trim().isEmpty()) {
						boolean inline = inlineDocumentResponse(result, request.params().get("application"));
						if (inline && ETag.check(request, file)) {
							notModified(request, file);
						} else {
							storage.sendFile(file,
									result.getString("name"), request,
									inline, result.getJsonObject("metadata"));
						}
					} else {
						notFound(request);
						request.response().setStatusCode(404).end();
					}

				} else {
					JsonObject error = new JsonObject().put("error", event.left().getValue());
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
			@Override
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
		JsonObject metadata = doc.getJsonObject("metadata");
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

	private void getVisibleRackUsers(final HttpServerRequest request, final Handler<JsonObject> handler){
		final String customReturn =
				"MATCH visibles-[:IN]->(:Group)-[:AUTHORIZED]->(:Role)-[:AUTHORIZE]->(a:Action) " +
				"WHERE has(a.name) AND a.name={action} AND NOT has(visibles.activationCode) " +
				"RETURN distinct visibles.id as id, visibles.displayName as username, visibles.lastName as name " +
				"ORDER BY name ";
		final JsonObject params = new JsonObject().put("action", "fr.wseduc.rack.controllers.RackController|listRack");
		UserUtils.findVisibleProfilsGroups(eb, request, new Handler<JsonArray>() {
			@Override
			public void handle(final JsonArray visibleGroups) {
				for (Object u : visibleGroups) {
					if (!(u instanceof JsonObject)) continue;
					JsonObject group = (JsonObject) u;
					UserUtils.groupDisplayName(group, I18n.acceptLanguage(request));
				}
				findVisibleUsers(eb, request, false, customReturn, params, new Handler<JsonArray>() {
					@Override
					public void handle(JsonArray visibleUsers) {
						JsonObject visibles = new JsonObject()
								.put("groups", visibleGroups)
								.put("users", visibleUsers);
						handler.handle(visibles);
					}
				});
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
		getVisibleRackUsers(request, new Handler<JsonObject>() {
			@Override
			public void handle(JsonObject users) {
				renderJson(request, users);
			}
		});
	}

	@Get("/users/group/:groupId")
	@SecuredAction(value = "", type = ActionType.AUTHENTICATED)
	public void listUsersInGroup(final HttpServerRequest request) {
		final String groupId = request.params().get("groupId");
		final String customReturn =
				"MATCH visibles-[:IN]->(:Group {id : {groupId}}) " +
				"RETURN distinct visibles.id as id, visibles.displayName as username, visibles.lastName as name " +
				"ORDER BY name ";
		final JsonObject params = new JsonObject()
				.put("groupId", groupId);

		UserUtils.findVisibleUsers(eb, request, false, false, null, customReturn, params, new Handler<JsonArray>() {
			@Override
			public void handle(JsonArray users) {
				renderJson(request, users);
			}
		});

	}

	/* Quota bus communication & utilities */

	private void getUserQuota(String userId, final Handler<JsonObject> handler){
		JsonObject message = new JsonObject();
		message.put("action", "getUserQuota");
		message.put("userId", userId);

		eb.send(QUOTA_BUS_ADDRESS, message, new Handler<AsyncResult<Message<JsonObject>>>() {
			@Override
			public void handle(AsyncResult<Message<JsonObject>> reply) {
				handler.handle(reply.result().body());
			}
		});
	}

	private void updateUserQuota(final String userId, long size){
		JsonObject message = new JsonObject();
		message.put("action", "updateUserQuota");
		message.put("userId", userId);
		message.put("size", size);
		message.put("threshold", threshold);

		eb.send(QUOTA_BUS_ADDRESS, message, new Handler<AsyncResult<Message<JsonObject>>>() {
			@Override
			public void handle(AsyncResult<Message<JsonObject>> reply) {
				JsonObject obj = reply.result().body();
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
		notification.notifyTimeline(new JsonHttpServerRequest(new JsonObject()), "rack.storage", null, recipients, new JsonObject());
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
					for (String attr : j.fieldNames()) {
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
	 * @param request Client request with file ids and destination folder (optional) in the body using json format.
	 */
	@Post("/copy")
	@SecuredAction(workspacecopy)
	public void rackToWorkspace(final HttpServerRequest request){
		UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
			@Override
			public void handle(final UserInfos user) {
				if(user != null){
					RequestUtils.bodyToJson(request, pathPrefix + "rackToWorkspace", new Handler<JsonObject>(){
						@Override
						public void handle(JsonObject json) {
							JsonArray idsArray = json.getJsonArray("ids");
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
									totalSize +=  added.getJsonObject("metadata", new JsonObject()).getLong("size", 0l);
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

			@Override
			public void handle(Message<JsonObject> r) {
				JsonObject src = r.body();
				if ("ok".equals(src.getString("status")) && src.getJsonArray("results") != null) {
					final JsonArray origs = src.getJsonArray("results");
					final JsonArray insert = new JsonArray();
					final AtomicInteger number = new AtomicInteger(origs.size());

					emptySize(user, new Handler<Long>() {

						@Override
						public void handle(Long emptySize) {
							long size = 0;

							/* Get total file size */
							for (Object o: origs) {
								if (!(o instanceof JsonObject)) continue;
								JsonObject metadata = ((JsonObject) o).getJsonObject("metadata");
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
								dest.remove("_id");
								dest.remove("protected");
								dest.remove("comments");
								dest.put("application", WORKSPACE_NAME);

								dest.put("owner", user.getUserId());
								dest.put("ownerName", dest.getString("toName"));
								dest.remove("to");
								dest.remove("from");
								dest.remove("toName");
								dest.remove("fromName");

								dest.put("created", now);
								dest.put("modified", now);
								if (folder != null && !folder.trim().isEmpty()) {
									dest.put("folder", folder);
								} else {
									dest.remove("folder");
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
												JsonObject parent = event.body().getJsonObject("result");
												if(parent != null && parent.getJsonArray("shared") != null && parent.getJsonArray("shared").size() > 0)
													dest.put("shared", parent.getJsonArray("shared"));

												if (filePath != null) {
													storage.copyFile(filePath, new Handler<JsonObject>() {
														@Override
														public void handle(JsonObject event) {
															if (event != null && "ok".equals(event.getString("status"))) {
																dest.put("file", event.getString("_id"));
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
									storage.copyFile(filePath, new Handler<JsonObject>() {

										@Override
										public void handle(JsonObject event) {
											if (event != null && "ok".equals(event.getString("status"))) {
												dest.put("file", event.getString("_id"));
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
			@Override
			public void handle(Either<String, JsonObject> event) {
				if(event.isRight()){
					final JsonObject result = event.right().getValue();

					String file = result.getString("file");
					Set<Entry<String, Object>> thumbnails = new HashSet<Entry<String, Object>>();
					if(result.containsKey("thumbnails")){
						thumbnails = result.getJsonObject("thumbnails").getMap().entrySet();
					}

					storage.removeFile(file, new Handler<JsonObject>() {
						@Override
						public void handle(JsonObject event) {
							if (event != null && "ok".equals(event.getString("status"))) {
									rackService.deleteRack(id, new Handler<Either<String,JsonObject>>() {
										@Override
										public void handle(Either<String, JsonObject> deletionEvent) {
											if(deletionEvent.isRight()){
												JsonObject deletionResult = deletionEvent.right().getValue();
												long size = -1l * result.getJsonObject("metadata", new JsonObject()).getLong("size", 0l);
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
						storage.removeFile(thumbnail.getValue().toString(), new Handler<JsonObject>(){
							@Override
							public void handle(JsonObject event) {
								if (event == null || !"ok".equals(event.getString("status"))) {
									logger.error("[gridfsRemoveFile] Error while deleting thumbnail "+thumbnail);
								}
							}
						});
					}

				} else {
					JsonObject error = new JsonObject().put("error", event.left().getValue());
					Renders.renderJson(request, error, 400);
				}
			}
		});
	}

	private void addAfterUpload(final JsonObject uploaded, final JsonObject doc, String name, String application, final List<String> thumbs, final Handler<Message<JsonObject>> handler) {
		//Write additional fields in the document
		doc.put("name", getOrElse(name, uploaded.getJsonObject("metadata").getString("filename"), false));
		doc.put("metadata", uploaded.getJsonObject("metadata"));
		doc.put("file", uploaded.getString("_id"));
		doc.put("application", getOrElse(application, WORKSPACE_NAME));
		//Save document to mongo
		mongo.save(collection, doc, new Handler<Message<JsonObject>>() {
			@Override
			public void handle(Message<JsonObject> res) {
				if ("ok".equals(res.body().getString("status"))) {
					Long size = doc.getJsonObject("metadata", new JsonObject()).getLong("size", 0l);
					updateUserQuota(doc.getString("to"), size);
					createThumbnailIfNeeded(collection, uploaded, res.body().getString("_id"), null, thumbs);
				}
				if (handler != null) {
					handler.handle(res);
				}
			}
		});
	}

	private void createThumbnailIfNeeded(final String collection, final JsonObject srcFile,
			final String documentId, JsonObject oldThumbnail, final List<String> thumbs) {
		if (documentId != null && thumbs != null && !documentId.trim().isEmpty() && !thumbs.isEmpty() &&
				srcFile != null && isImage(srcFile) && srcFile.getString("_id") != null) {
			createThumbnails(thumbs, srcFile, collection, documentId);
		}
		if (oldThumbnail != null) {
			for (String attr: oldThumbnail.fieldNames()) {
				storage.removeFile(oldThumbnail.getString(attr), null);
			}
		}
	}

	private void createThumbnails(List<String> thumbs, JsonObject srcFile, final String collection, final String documentId) {
		Pattern size = Pattern.compile("([0-9]+)x([0-9]+)");
		JsonArray outputs = new JsonArray();
		for (String thumb: thumbs) {
			Matcher m = size.matcher(thumb);
			if (m.matches()) {
				try {
					int width = Integer.parseInt(m.group(1));
					int height = Integer.parseInt(m.group(2));
					if (width == 0 && height == 0) continue;
					JsonObject j = new JsonObject().put("dest",
							storage.getProtocol() + "://" + storage.getBucket());
					if (width != 0) {
						j.put("width", width);
					}
					if (height != 0) {
						j.put("height", height);
					}
					outputs.add(j);
				} catch (NumberFormatException e) {
					log.error("Invalid thumbnail size.", e);
				}
			}
		}
		if (outputs.size() > 0) {
			JsonObject json = new JsonObject()
					.put("action", "resizeMultiple")
					.put("src", storage.getProtocol() + "://" + storage.getBucket() + ":"
							+ srcFile.getString("_id"))
					.put("destinations", outputs);
			eb.send(imageResizerAddress, json, new Handler<AsyncResult<Message<JsonObject>>>() {
				@Override
				public void handle(AsyncResult<Message<JsonObject>> event) {
					if (event.succeeded()) {
						JsonObject thumbnails = event.result().body().getJsonObject("outputs");
						if ("ok".equals(event.result().body().getString("status")) && thumbnails != null) {
							mongo.update(collection, new JsonObject().put("_id", documentId),
									new JsonObject().put("$set", new JsonObject()
											.put("thumbnails", thumbnails)));
						}
					} else {
						log.error("Error when resize image.", event.cause());
					}
				}
			});
		}
	}

	private boolean isImage(JsonObject doc) {
		if (doc == null) {
			return false;
		}
		JsonObject metadata = doc.getJsonObject("metadata");
		return metadata != null && (
				"image/jpeg".equals(metadata.getString("content-type")) ||
				"image/gif".equals(metadata.getString("content-type"))  ||
				"image/png".equals(metadata.getString("content-type"))  ||
				"image/tiff".equals(metadata.getString("content-type"))
		);
	}

}
