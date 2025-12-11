import { notify, idiom as lang, template, routes, model, ng } from 'entcore';
import { Rack } from '../model/rack';
import { _ } from 'entcore';

export let libraryController = ng.controller('LibraryController', [
    '$scope', '$filter',
    function ($scope, $filter) {
        $scope.filterRack = Rack.instance.filters.mine;
        $scope.totalDisplayed = 0;
        $scope.select = { 
            all: false,
            folderName: 'mine'
        };
        $scope.ordering = '-sent';

        $scope.open = (folderName: string) => {
            Rack.instance.files.selection.deselectAll();
            $scope.filterRack = Rack.instance.filters[folderName];
            $scope.select.all = false;
            $scope.select.folderName = folderName;
            Rack.instance.sync();
            template.open('toaster', 'toaster/' + folderName);
            if (!template.contains('list', 'table-list') && !template.contains('list', 'icons-list')) {
                template.open('list', 'table-list');
            }
        };

        $scope.trash = async () => {
            await Rack.instance.files.trashSelection();
            Rack.instance.files.selection.deselectAll();
            $scope.updateTotalDisplayed();
            $scope.$apply();
        };

        $scope.delete = async () => { 
            await Rack.instance.files.delete();
            Rack.instance.files.selection.deselectAll();
            $scope.updateTotalDisplayed();
            $scope.$apply();
        };

        $scope.restore = async () => {
            await Rack.instance.files.restore();
            Rack.instance.files.selection.deselectAll();
            $scope.updateTotalDisplayed();
            $scope.$apply();
        };

        $scope.switchAll = function () {
            if ($scope.select.all) {
                if (typeof $scope.filterRack === 'function') {
                    $scope.rackList.all.forEach((item) => {
                        item.selected = $scope.filterRack(item);
                    });
                }
            }
            else {
                Rack.instance.files.selection.deselectAll();
            }
        };

        $scope.orderBy = (what) => $scope.ordering = ($scope.ordering === what ? '-' + what : what);

        Rack.instance.eventer.on('sync', () => {
            $scope.updateTotalDisplayed();
        });

        $scope.updateTotalDisplayed = () => {
            $scope.totalDisplayed =
                $filter('filter')($scope.rackList.all, $scope.filterRack, true).length;
            $scope.$apply();
        }
    }
]);
