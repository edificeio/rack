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
