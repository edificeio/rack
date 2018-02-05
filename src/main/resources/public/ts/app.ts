import { routes, ng } from 'entcore';
import { libraryController} from './controllers/library';
import { rackController } from './controllers/rack';

ng.controllers.push(libraryController);
ng.controllers.push(rackController);

routes.define(function ($routeProvider) {
    $routeProvider
        .otherwise({
            action: 'defaultView'
        })
});