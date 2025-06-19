package fr.wseduc.rack.services;

import static fr.wseduc.webutils.Utils.getOrElse;

import fr.wseduc.mongodb.MongoDb;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.service.impl.MongoDbCrudService;

public class NextcloudSyncServiceImpl extends MongoDbCrudService implements NextcloudSyncService {

    private final MongoDb mongo;
    private final String collection;
    private static final Logger logger = LoggerFactory.getLogger(NextcloudSyncServiceImpl.class);
    private final Vertx vertx;
    private final JsonObject config;
    private final AtomicBoolean syncInProgress = new AtomicBoolean(false);

    public NextcloudSyncServiceImpl(final String collection, Vertx vertx, JsonObject config) {
        super(collection);
        this.collection = collection;
        this.mongo = MongoDb.getInstance();
        this.vertx = vertx;
        this.config = config;
    }

    @Override
    public void startPeriodicSync() {
        final long syncDelayMinutes = config.getLong("nextcloud-sync-delay", 10L);
        final long syncDelayMilliseconds = TimeUnit.MILLISECONDS.convert(syncDelayMinutes,
                TimeUnit.MINUTES);

        vertx.setPeriodic(syncDelayMilliseconds, event -> {
            if (syncInProgress.compareAndSet(false, true)) {
                syncAllDocuments()
                        .onComplete(ar -> syncInProgress.set(false))
                        .onFailure(err -> {
                            logger.error(
                                    "[Rack Nextcloud sync] Something went wrong: " + err.getMessage(),
                                    err);
                        });
            } else {
                logger.info(
                        "[Rack Nextcloud sync] Nextcloud sync already in progress, skipping this cycle");
            }
        });
    }

    private Future<Void> syncAllDocuments() {
        logger.info("[Rack Nextcloud sync] Nextcloud sync started");
        return fetchAllDocument()
                .map(this::filterDocuments)
                .compose(this::filterStudent)
                .compose(this::sendAllDocumentsToNextcloud);
    }

    private Future<List<JsonObject>> fetchAllDocument() {
        Promise<List<JsonObject>> promise = Promise.promise();

        mongo.find(collection, new JsonObject(), message -> {
            JsonObject body = message.body();

            if ("ok".equals(message.body().getString("status"))) {
                JsonArray results = body.getJsonArray("results");

                List<JsonObject> documents = Optional.ofNullable(results)
                        .map(JsonArray::stream)
                        .orElse(Stream.empty())
                        .map(JsonObject.class::cast)
                        .collect(Collectors.toList());

                promise.complete(documents);
            } else {
                promise.fail("Something went wrong while fetching documents");
            }
        });

        return promise.future();
    }

    private List<JsonObject> filterDocuments(List<JsonObject> documents) {
        return documents.stream().filter(this::isNotSynced).filter(this::isNotInTrash)
                .collect(Collectors.toList());
    }

    private Future<List<JsonObject>> filterStudent(List<JsonObject> documents) {
        List<Future<JsonObject>> studentChecks = documents
                .stream()
                .map(this::checkStudentAndKeepDoc)
                .collect(Collectors.toList());

        return Future.join(studentChecks).map(compositeFuture ->
                compositeFuture.<JsonObject>list().stream().filter(Objects::nonNull)
                        .collect(Collectors.toList())
        );
    }

    /*
     * This method is used to check if the recipient is a student
     * If true, it returns the document
     * If false, it returns null
     * */
    private Future<JsonObject> checkStudentAndKeepDoc(JsonObject doc) {
        String recipientId = getRecipientId(doc);
        return isRecipientStudent(recipientId).map(isStudent -> isStudent ? doc : null);
    }

    private String getRecipientId(JsonObject doc) {
        return doc.getString("to");
    }

    private boolean isNotSynced(JsonObject doc) {
        Boolean synced = doc.getBoolean("synced");
        return synced == null || !synced;
    }

    private boolean isNotInTrash(JsonObject doc) {
        return !"Trash".equals(doc.getString("folder"));
    }

    private Future<Boolean> isRecipientStudent(String userId) {
        Promise<Boolean> promise = Promise.promise();

        String query = "MATCH (u:User {id: {id}}) RETURN HEAD(u.profiles) as profile";
        Map<String, Object> params = new HashMap<>();
        params.put("id", userId);

        Neo4j.getInstance().execute(query, params, res -> {
            boolean isStudent = Optional.ofNullable(res.body())
                    .filter(body -> "ok".equals(body.getString("status")))
                    .map(body -> body.getJsonArray("result"))
                    .filter(result -> !result.isEmpty())
                    .map(result -> result.getJsonObject(0).getString("profile"))
                    .map("Student"::equalsIgnoreCase)
                    .orElse(false);

            promise.complete(isStudent);
        });

        return promise.future();
    }
    
    private Future<Void> sendAllDocumentsToNextcloud(List<JsonObject> documents) {
        if (documents.isEmpty()) {
            return Future.succeededFuture();
        }

        List<Future<Void>> sendFutures = documents
                .stream()
                .map(this::sendDocumentToNextcloud)
                .collect(Collectors.toList());

        return Future.join(sendFutures).map(res -> null);
    }

    private Future<Void> sendDocumentToNextcloud(JsonObject doc) {
        final String fileId = doc.getString("file");
        final JsonObject metadata = doc.getJsonObject("metadata", new JsonObject());
        final String recipientId = doc.getString("to");
        final String documentId = doc.getString("_id");

        return sendFileToNextcloud(fileId, metadata, recipientId, documentId);
    }

    private Future<Void> sendFileToNextcloud(
            String fileId,
            JsonObject metadata,
            String recipientId,
            String documentId
    ) {
        Promise<Void> promise = Promise.promise();

        JsonObject eventBody = new JsonObject()
                .put("fileId", fileId)
                .put("documentId", documentId)
                .put("metadata", metadata)
                .put("recipientId", recipientId)
                .put("host", extractHostname(getOrElse(config.getString("host"), "")));

        vertx
                .eventBus()
                .request("nextcloud.rack.upload", eventBody, handler -> {
                    if (handler.succeeded()) {
                        JsonObject response = (JsonObject) handler.result().body();

                        if ("OK".equals(response.getString("status"))) {
                            setDocumentSyncedStatus(documentId, true);
                        }
                        promise.complete();
                    } else {
                        promise.fail(handler.cause());
                    }
                });

        return promise.future();
    }

    private void setDocumentSyncedStatus(String documentId, boolean synced) {
        mongo.update(
                collection,
                new JsonObject().put("_id", documentId),
                new JsonObject().put("$set", new JsonObject().put("synced", synced)),
                res -> {
                    if (!"ok".equals(res.body().getString("status"))) {
                        logger.error(
                                "Failed to update 'synced' status for document: " + documentId);
                    }
                }
        );
    }

    private String extractHostname(String host) {
        return Optional.ofNullable(host)
                .filter(h -> !h.trim().isEmpty())
                .map(h -> h.replaceFirst("^https?://", ""))
                .orElse("");
    }
}
