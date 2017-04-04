import { notify, idiom as lang, template, routes, model, ng } from 'entcore/entcore';
import { Rack, Visible, User, Group, Quota, Folder, SendResult } from '../model';
import { moment } from 'entcore/libs/moment/moment';
import { _ } from 'entcore/libs/underscore/underscore';

export let rackController = ng.controller('RackController', [
    '$scope', 'route', 'model',
    function ($scope, route, model) {
        $scope.refreshPickingList = function () {
            Rack.instance.directory.search($scope.filters.itemFilter);
            $scope.pickingList = Rack.instance.directory.found;
        };

        $scope.rackList = Rack.instance.files;
        $scope.visibles = Rack.instance.directory.visibles;
        $scope.workspaceFolders = Rack.instance.folders;
        $scope.template = template;
        $scope.lang = lang;
        $scope.quota = new Quota();
        $scope.to = [];
        $scope.lightboxes = {};

        $scope.display = {
            limit: 20
        };
        
        $scope.filters = {
            itemFilter: ""
        };

        Rack.instance.sync();
        Rack.instance.eventer.on('directory.sync', $scope.refreshPickingList);
        Rack.instance.eventer.on('sync', () => $scope.$apply());

        template.open('send-rack', 'send-rack');
        template.open('copy-files', 'copy-files');
        template.open('toaster', 'toaster/mine');
        template.open('list', 'table-list');

        route({
            defaultView: function () {
                template.open('main', 'library');
            }
        });

        $scope.longDate = function (dateStr) {
            return moment(dateStr.replace('.', ':')).format('lll');
        };

        $scope.openNewRack = async () => {
            $scope.lightboxes.sendRack = true;
            await Rack.instance.directory.sync();
            $scope.pickingList = Rack.instance.directory.found;
            $scope.to = [];
            $scope.newFile = { 
                name: lang.translate('nofile'), 
                files: [], 
                chosenFiles: [] 
            };
            $scope.$apply();
        };

        $scope.openMoveToDocs = async () => {
            $scope.lightboxes.copy = true;
            $scope.newFolder = new Folder("");
            await $scope.getWorkspaceFolders();
        };

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

        $scope.addRackTo = async (item: Visible) => {
            if(item instanceof User){
                if (!$scope.containsRackTo(item)){
                    $scope.to.push(item);
                }
                else{
                    $scope.to.splice($scope.to.indexOf(item), 1);
                }
            }
            else if(item instanceof Group){
                await item.sync();
                let added = item.users.filter(u => u.id !== undefined && !$scope.containsRackTo(u));
                $scope.to = $scope.to.concat(added);
                $scope.$apply();
            }
        };

        $scope.removeRackTo = function (item) {
            $scope.to = _.reject($scope.to, function (elem) {
                return elem.id === item.id
            });
        };

        $scope.resetRackTo = function (item) {
            $scope.to = [];
        };

        $scope.containsRackTo = function (item) {
            return _.findWhere($scope.to, { id: item.id }) !== undefined
        }

        $scope.sendRackFiles =  async () => {
            $scope.lightboxes.sendRack = false;
            $scope.loading = lang.translate('loading');
            $scope.newFile.loading = true;

            let n = $scope.newFile.files.length;
            let plurality = n > 1 ? ".plural" : "";

            let results: SendResult[] = [];
            for(let file of $scope.newFile.files){
                let result = await Rack.instance.sendFile(file, $scope.to);
                results.push(result);
            }
            
            if(!results.find(r => r.success > 0)){
                notify.error('rack.sent.message.error' + plurality);
            }
            else if (!results.find(r => r.failure > 0 )) {
                notify.info('rack.sent.message' + plurality);
            }
            else if (results.find(r => r.success > 0)) {
                notify.error('rack.sent.message.partial' + plurality);
            }

            $scope.newFile.loading = false;
            await Rack.instance.sync();
            $scope.$apply();
        }

        $scope.getWorkspaceFolders = async () => {
            $scope.folder = undefined;
            $scope.folder = {
                name: lang.translate('rack.root'),
                children: $scope.workspaceFolders.all,
                path: '',
                parent: ''
            };
            $scope.targetFolder = $scope.folder;
            await Rack.instance.folders.sync();
        };

        $scope.isTargetFolder = function (folder) {
            return $scope.targetFolder && $scope.targetFolder.path === folder.path;
        }

        $scope.addTargetFolder = function (folder) {
            $scope.targetFolder = folder;
        };

        $scope.createEditFolder = async () => {
            $scope.newFolder.path = $scope.targetFolder.path
            await $scope.newFolder.create();
            $scope.targetFolder = null
            $scope.getWorkspaceFolders();
            $scope.$apply();
        };

        $scope.copy = function () {
            $scope.lightboxes.copy = false;
            Rack.instance.files.copyToWorkspace($scope.targetFolder.path);
        };
    }
]);