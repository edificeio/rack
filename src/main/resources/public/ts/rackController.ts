import { notify, idiom as lang, template, routes, model, ng } from './entcore/entcore';
import { rack, VisibleUser, VisibleGroup, Quota, Folder } from './model';
import { moment } from './entcore/libs/moment/moment';

let _ = require('underscore');

export let rackController = ng.controller('RackController', [
    '$scope', 'route', 'model',
    function ($scope, route, model) {

        $scope.refreshPickingList = function () {
            if (!$scope.filters.itemFilter) {
                $scope.display.pickingList = rack.directory.visibleUsers.all.concat(rack.directory.visibleGroups.all as any);
                $scope.display.pickingList.sort((a, b) => {
                    return (a.name || a.username || '') > (b.name || b.username || '');
                });
                return;
            }

            $scope.filters.itemFilter = lang.removeAccents($scope.filters.itemFilter.toLowerCase());

            $scope.display.pickingList = _.filter(rack.directory.visibleUsers.all.concat(rack.directory.visibleGroups.all as any), (item) => {
                if(!$scope.filters.itemFilter){
                    return true;
                }
                return item.id && $scope.filters.itemFilter && lang.removeAccents((item.username || item.name || '').toLowerCase()).indexOf($scope.filters.itemFilter) > -1;
            });
            $scope.display.pickingList.sort((a, b) => {
                return (a.name || a.username || '') > (b.name || b.username || '');
            });
        };

        $scope.rackList = rack.rackFiles;
        $scope.template = template;
        $scope.lang = lang;
        $scope.quota = new Quota();
        $scope.to = [];
        $scope.lightboxes = {};
        $scope.display = {
            limit: 20,
            pickingList: []
        };
        
        rack.directory.on('sync', $scope.refreshPickingList);

        template.open('send-rack', 'send-rack');
        template.open('copy-files', 'copy-files');

        route({
            defaultView: function () {
                template.open('main', 'library');
            }
        })

        $scope.longDate = function (dateStr) {
            return moment(dateStr.replace('.', ':')).format('lll');
        }

        $scope.openNewRack = function () {
            rack.directory.sync();
            
            $scope.to = [];
            $scope.newFile = { name: lang.translate('nofile'), files: [], chosenFiles: [] };
            $scope.lightboxes.sendRack = true;
        }

        $scope.openMoveToDocs = function () {
            $scope.getWorkspaceFolders();
            $scope.newFolder = new Folder("");

            $scope.lightboxes.copy = true;
        };

        $scope.visibleUsers = rack.directory.visibleUsers;
        $scope.visibleGroups = rack.directory.visibleGroups;

        $scope.setFilesName = function () {
            $scope.newFile.name = ''
            $scope.newFile.chosenFiles = []
            for (let i = 0; i < $scope.newFile.files.length; i++) {
                let file = $scope.newFile.files[i]
                let splitList = file.name.split('.')
                let extension = splitList[splitList.length - 1]

                let newFile = { file: file, name: file.name.split('.' + extension)[0], extension: '' }
                if ($scope.newFile.name !== '') {
                    $scope.newFile.name = $scope.newFile.name + ', '
                }
                $scope.newFile.name = $scope.newFile.name + file.name.split('.' + extension)[0]
                if (splitList.length > 1) {
                    newFile.extension = extension
                }

                $scope.newFile.chosenFiles.push(newFile)
            }
        }

        $scope.filters = {
            itemFilter: ""
        }

        $scope.addRackTo = function (item) {
            if (item instanceof VisibleUser)
                if (!$scope.containsRackTo(item))
                    $scope.to.push(item)
                else
                    $scope.to.splice($scope.to.indexOf(item), 1)
            else if (item instanceof VisibleGroup) {
                $scope.visibleUsers.all.forEach(function (user) {
                    if (_.findWhere(user.groups, { id: item.id }) !== undefined && !$scope.containsRackTo(user))
                        $scope.to.push(user)
                })
            }
        };

        $scope.removeRackTo = function (item) {
            $scope.to = _.reject($scope.to, function (elem) {
                return elem.id === item.id
            })
        };

        $scope.resetRackTo = function (item) {
            $scope.to = [];
        };

        $scope.containsRackTo = function (item) {
            return _.findWhere($scope.to, { id: item.id }) !== undefined
        }

        $scope.sendRackFiles = function () {
            $scope.lightboxes.sendRack = false;
            $scope.loading = lang.translate('loading');
            $scope.newFile.loading = true;

            let n = $scope.newFile.files.length;
            let plurality = n > 1 ? ".plural" : "";

            let awaiter = [];
            for (let i = 0; i < $scope.newFile.files.length; i++) {
                awaiter.push(rack.sendFile($scope.newFile.files[i], $scope.to));
            }
            Promise.all(awaiter).then((responses) => {
                if (_.every(responses, (r) => r.failure === 0 )) {
                    notify.info('rack.sent.message' + plurality);
                }
                else if (_.some(responses, (r) => r.success > 0)) {
                    notify.error('rack.sent.message.partial' + plurality);
                }
            })
            .catch(() => {
                notify.error('rack.sent.message.error' + plurality);
            });
        }

        // WORKSPACE FOLDERS //
        $scope.workspaceFolders = rack.folders;
        $scope.getWorkspaceFolders = function (hook: () => void) {
            $scope.folder = undefined;
            $scope.workspaceFolders.sync(() => {
                $scope.folder = {
                    name: lang.translate('rack.root'),
                    children: $scope.workspaceFolders.all,
                    path: '',
                    parent: ''
                };
                if (hook) {
                    hook();
                }
            });
        }
        $scope.getWorkspaceFolders()

        $scope.isTargetFolder = function (folder) {
            return $scope.targetFolder && $scope.targetFolder.path === folder.path
        }

        $scope.addTargetFolder = function (folder) {
            $scope.targetFolder = folder
        }

        $scope.createEditFolder = function () {
            $scope.newFolder.path = $scope.targetFolder.path
            $scope.newFolder.create().then(() => {
                $scope.targetFolder = null
                $scope.getWorkspaceFolders($scope.refreshDocsView);
            });
        }

        $scope.copy = function () {
            $scope.lightboxes.copy = false;
            rack.rackFiles.copyToWorkspace($scope.targetFolder.path);
        };
    }
]);