import { notify, idiom as lang, template, ui, http, routes, model, ng } from './entcore/entcore';
import { VisibleGroup, VisibleUser, Directory, rack } from './model';

import { libraryController} from './libraryController';
import { rackController } from './rackController';

let moment = require('moment');

ng.controllers.push(libraryController);
ng.controllers.push(rackController);

routes.define(function ($routeProvider) {
    $routeProvider
        .otherwise({
            action: 'defaultView'
        })
});