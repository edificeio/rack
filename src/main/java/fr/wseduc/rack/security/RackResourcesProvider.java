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

package fr.wseduc.rack.security;

import org.entcore.common.http.filter.ResourcesProvider;
import org.entcore.common.user.UserInfos;
import org.vertx.java.core.Handler;
import org.vertx.java.core.eventbus.Message;
import org.vertx.java.core.http.HttpServerRequest;
import org.vertx.java.core.json.JsonObject;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.rack.Rack;
import fr.wseduc.rack.controllers.RackController;
import fr.wseduc.webutils.http.Binding;

public class RackResourcesProvider implements ResourcesProvider{
	
	private MongoDb mongo = MongoDb.getInstance();

	@Override
	public void authorize(HttpServerRequest resourceRequest, Binding binding, UserInfos user, Handler<Boolean> handler) {
		final String serviceMethod = binding.getServiceMethod();
		if(serviceMethod != null && serviceMethod.startsWith(RackController.class.getName())) {
			String method = serviceMethod.substring(RackController.class.getName().length() + 1);
			switch (method) {
				case("getRack"):
				case("trashRack"):
				case("recoverRack"):
				case("deleteRackDocument"):
					authorizeOwner(resourceRequest, user, handler);
					break;
				default:
					handler.handle(false);
			}
		} else {
			handler.handle(false);
		}
	}
	
	private void authorizeOwner(HttpServerRequest request, UserInfos user, final Handler<Boolean> handler){
		String id = request.params().get("id");		
		String matcher = "{ \"_id\": \""+id+"\", \"to\": \""+user.getUserId()+"\" }";
		
		mongo.count(Rack.RACK_COLLECTION, new JsonObject(matcher), new Handler<Message<JsonObject>>(){
			public void handle(Message<JsonObject> result) {
				JsonObject res = result.body();
				handler.handle(
					res != null &&
					"ok".equals(res.getString("status")) &&
					res.getInteger("count") == 1
				);
			}
		});
	}

}
