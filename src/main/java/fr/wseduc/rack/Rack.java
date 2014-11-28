package fr.wseduc.rack;

import org.entcore.common.http.BaseServer;
import org.entcore.common.mongodb.MongoDbConf;

import fr.wseduc.rack.controllers.RackController;
import fr.wseduc.rack.security.RackResourcesProvider;

public class Rack extends BaseServer {

	public final static String RACK_COLLECTION = "racks";

	@Override
	public void start() {
		super.start();
		addController(new RackController(RACK_COLLECTION, container.config().getString("gridfs-address", "wse.gridfs.persistor")));
		MongoDbConf.getInstance().setCollection(RACK_COLLECTION);
		setDefaultResourceFilter(new RackResourcesProvider());
	}

}
