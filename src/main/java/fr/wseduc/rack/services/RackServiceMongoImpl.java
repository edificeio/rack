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

import static org.entcore.common.mongodb.MongoDbResult.validActionResultHandler;

import org.entcore.common.mongodb.MongoDbResult;
import org.entcore.common.service.impl.MongoDbCrudService;
import org.entcore.common.user.UserInfos;
import org.vertx.java.core.Handler;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;

import com.mongodb.QueryBuilder;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.mongodb.MongoQueryBuilder;
import fr.wseduc.webutils.Either;

/**
 * MongoDB implementation of the REST service.
 * Methods are usually self-explanatory.
 */
public class RackServiceMongoImpl extends MongoDbCrudService implements RackService{

	private final String collection;
	private final MongoDb mongo;

	public RackServiceMongoImpl(final String collection) {
		super(collection);
		this.collection = collection;
		this.mongo = MongoDb.getInstance();
	}


	public void listRack(UserInfos user, Handler<Either<String, JsonArray>> handler) {
		QueryBuilder query = QueryBuilder
				.start()
				.or(
					QueryBuilder.start("to").is(user.getUserId()).get(),
					QueryBuilder.start("from").is(user.getUserId()).get()
				)
				.and("file").exists(true);

		mongo.find(collection, MongoQueryBuilder.build(query), MongoDbResult.validResultsHandler(handler));
	}

	public void getRack(String id, Handler<Either<String, JsonObject>> handler) {
		mongo.findOne(collection, MongoQueryBuilder.build(QueryBuilder.start("_id").is(id)), MongoDbResult.validResultHandler(handler));
	}

	public void trashRack(String id, Handler<Either<String, JsonObject>> handler) {
		JsonObject modifider = new JsonObject();
		modifider.putString("folder", "Trash");

		super.update(id, modifider, handler);
	}

	public void recoverRack(String id, Handler<Either<String, JsonObject>> handler) {
		JsonObject modifier = new JsonObject("{ \"$unset\": { \"folder\" : \"\"} }");
		mongo.update(collection, new JsonObject("{ \"_id\": \""+id+"\" }"), modifier, validActionResultHandler(handler));
	}
	
	public void deleteRack(String id, Handler<Either<String, JsonObject>> handler) {
		mongo.delete(collection, new JsonObject("{ \"_id\": \""+id+"\" }"), validActionResultHandler(handler));
	}

}
