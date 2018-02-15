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

package fr.wseduc.rack.security;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.rack.Rack;
import fr.wseduc.rack.controllers.RackController;
import fr.wseduc.webutils.http.Binding;
import io.vertx.core.Handler;
import io.vertx.core.eventbus.Message;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.http.filter.ResourcesProvider;
import org.entcore.common.user.UserInfos;

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
					res.getLong("count") == 1
				);
			}
		});
	}

}
