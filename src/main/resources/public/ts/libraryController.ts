import { notify, idiom as lang, template, routes, model, ng } from 'entcore/entcore';
import { rack } from './model';

let _ = require('underscore');

export let libraryController = ng.controller('LibraryController', [
    '$scope',
    function ($scope) {
        $scope.filterRack = () => true;
        $scope.select = { all: false };
        $scope.ordering = '-sent';

        $scope.refreshListing = function (folder) {
            $scope.filterRack = folder.filtering;
            $scope.select.all = false;
            rack.rackFiles.sync();
            $scope.folder = folder;
            if (!template.contains('list', 'table-list') && !template.contains('list', 'icons-list')) {
                template.open('list', 'table-list');
            }
        }

        $scope.folders = [
            {
                name: "mine",
                filtering: (item) => item.to === model.me.userId && item.folder !== "Trash",
                bottomBarButtons: [
                    {
                        name: "remove",
                        showCondition: () => true,
                        onClick: () => rack.rackFiles.trashSelection()
                    },
                    {
                        name: "rack.racktodocs",
                        showCondition: () => model.me.workflow.rack.workspaceCopy,
                        onClick: () => $scope.openMoveToDocs()
                    }
                ]
            },
            {
                name: "history",
                filtering: (item) => item.from === model.me.userId,
                extraColumns: ["to"],
                readOnly: true
            },
            {
                name: "trash",
                filtering: (item) => item.to === model.me.userId && item.folder === "Trash",
                bottomBarButtons: [
                    {
                        name: "restore",
                        showCondition: () => true,
                        onClick: () => rack.rackFiles.restore()
                    },
                    {
                        name: "remove",
                        showCondition: () => true,
                        onClick: () => rack.rackFiles.delete()
                    }
                ]
            }
        ];

        $scope.refreshListing($scope.folders[0]);

        $scope.switchAll = function () {
            if ($scope.select.all) {
                if (typeof $scope.filterRack === 'function') {
                    $scope.rackList.select($scope.filterRack);
                }
            }
            else {
                $scope.rackList.deselectAll();
            }
        }

        $scope.orderBy = (what) =>
            $scope.ordering = ($scope.ordering === what ? '-' + what : what);
    }
]);
