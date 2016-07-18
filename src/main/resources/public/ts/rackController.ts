import { notify, idiom as lang, template, routes, model, ng } from './entcore/entcore';
import { rack, VisibleUser, VisibleGroup, Quota, Folder } from './model';
import { moment } from './entcore/libs/moment/moment';

var _ = require('underscore');

export var rackController = ng.controller('RackController', [
    '$scope', 'route', 'model',
    function ($scope, route, model) {
        $scope.rackList = rack.rackFiles;
        $scope.template = template;
        $scope.lang = lang;
        $scope.quota = new Quota();
        $scope.to = [];
        $scope.lightboxes = {};
        
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
            rack.directory.visibleUsers.sync();
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
            for (var i = 0; i < $scope.newFile.files.length; i++) {
                var file = $scope.newFile.files[i]
                var splitList = file.name.split('.')
                var extension = splitList[splitList.length - 1]

                var newFile = { file: file, name: file.name.split('.' + extension)[0], extension: '' }
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

        $scope.filterRackTo = function (item) {
            var field = item.username ? "username" : "name"
            return $scope.filters.itemFilter ? lang.removeAccents(item[field].toLowerCase()).indexOf(lang.removeAccents($scope.filters.itemFilter.toLowerCase())) > -1 : true
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
        }
        $scope.removeRackTo = function (item) {
            $scope.to = _.reject($scope.to, function (elem) {
                return elem.id === item.id
            })
        }
        $scope.containsRackTo = function (item) {
            return _.findWhere($scope.to, { id: item.id }) !== undefined
        }

        $scope.sendRackFiles = function () {
            $scope.lightboxes.sendRack = false;
            $scope.loading = lang.translate('loading');
            $scope.newFile.loading = true;

            var n = $scope.newFile.files.length;
            var plurality = n > 1 ? ".plural" : "";

            var awaiter = [];
            for (var i = 0; i < $scope.newFile.files.length; i++) {
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