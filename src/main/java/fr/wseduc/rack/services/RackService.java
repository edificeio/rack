package fr.wseduc.rack.services;

import org.entcore.common.user.UserInfos;
import org.vertx.java.core.Handler;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;

import fr.wseduc.webutils.Either;

/**
 * Generic REST service for Rack.
 */
public interface RackService {

	//CRUD
	public void getRack(String id, Handler<Either<String, JsonObject>> handler);
	public void listRack(UserInfos user, Handler<Either<String, JsonArray>> handler);
	public void deleteRack(String id, Handler<Either<String, JsonObject>> handler);

	//TRASHBIN
	public void trashRack(String id, Handler<Either<String, JsonObject>> handler);
	public void recoverRack(String id, Handler<Either<String, JsonObject>> handler);

}
