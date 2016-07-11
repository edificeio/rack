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

package fr.wseduc.rack;

import org.entcore.common.http.BaseServer;
import org.entcore.common.mongodb.MongoDbConf;
import org.entcore.common.storage.Storage;
import org.entcore.common.storage.StorageFactory;

import fr.wseduc.rack.controllers.RackController;
import fr.wseduc.rack.security.RackResourcesProvider;

public class Rack extends BaseServer {

	public final static String RACK_COLLECTION = "racks";

	@Override
	public void start() {
		super.start();
		Storage storage = new StorageFactory(vertx, config).getStorage();
		RackController rackController = new RackController(RACK_COLLECTION, storage);
		MongoDbConf.getInstance().setCollection(RACK_COLLECTION);
		setDefaultResourceFilter(new RackResourcesProvider());

		addController(rackController);
	}

}
