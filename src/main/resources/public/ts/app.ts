import { notify, idiom as lang, template, ui, http, routes, model, ng } from 'entcore/entcore';
import { moment } from 'entcore/libs/moment/moment';
import { VisibleGroup, VisibleUser, Directory, rack } from './model';

import { libraryController} from './libraryController';
import { rackController } from './rackController';

ng.controllers.push(libraryController);
ng.controllers.push(rackController);

routes.define(function ($routeProvider) {
    $routeProvider
        .otherwise({
            action: 'defaultView'
        })
});