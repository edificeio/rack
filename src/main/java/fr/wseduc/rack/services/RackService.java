/*
 * Copyright © WebServices pour l'Éducation, 2014
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
