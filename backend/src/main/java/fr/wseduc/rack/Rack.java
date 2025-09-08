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

package fr.wseduc.rack;

import fr.wseduc.webutils.collections.SharedDataHelper;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import org.apache.commons.lang3.tuple.Pair;
import org.entcore.common.http.BaseServer;
import org.entcore.common.mongodb.MongoDbConf;
import org.entcore.common.storage.Storage;
import org.entcore.common.storage.StorageFactory;
import org.entcore.common.storage.impl.MongoDBApplicationStorage;

import fr.wseduc.rack.controllers.RackController;
import fr.wseduc.rack.security.RackResourcesProvider;
import fr.wseduc.rack.services.RackRepositoryEvent;
import io.vertx.core.json.JsonObject;

public class Rack extends BaseServer {

	public final static String RACK_COLLECTION = "racks";

	@Override
	public void start(Promise<Void> startPromise) throws Exception {
		final Promise<Void> promise = Promise.promise();
		super.start(promise);
		promise.future()
				.compose(init -> StorageFactory.build(vertx, config, new MongoDBApplicationStorage(RACK_COLLECTION, Rack.class.getSimpleName(), new JsonObject().put("owner", "from"))))
				.compose(storageFactory -> SharedDataHelper.getInstance().getMulti("server", "node").map(rackConfigMap -> Pair.of(storageFactory, rackConfigMap)))
				.compose(configPair -> initRack(configPair.getLeft(), configPair.getRight()))
				.onComplete(startPromise);
	}

	public Future<Void> initRack(StorageFactory storageFactory, final java.util.Map<String, Object> rackConfigMap) {
		Storage storage = storageFactory.getStorage();
		RackController rackController = new RackController(RACK_COLLECTION, storage, (String) rackConfigMap.get("node"));
		MongoDbConf.getInstance().setCollection(RACK_COLLECTION);
		setDefaultResourceFilter(new RackResourcesProvider());

		addController(rackController);
		setRepositoryEvents(new RackRepositoryEvent(vertx, storage));
		return Future.succeededFuture();
	}

}
