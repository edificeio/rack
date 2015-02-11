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
