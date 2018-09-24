import { notify, idiom as lang, template, routes, model, ng } from 'entcore';
import { Rack, Visible, User, Group, quota, Folder, SendResult, Sharebookmark } from '../model';
import { moment } from 'entcore';
import { _ } from 'entcore';

export let rackController = ng.controller('RackController', [
    '$scope', 'route', 'model',
    function ($scope, route, model) {
        $scope.rackList = Rack.instance.files;
        $scope.visibles = Rack.instance.directory.visibles;
        $scope.workspaceFolders = Rack.instance.folders;
        $scope.template = template;
        $scope.lang = lang;
        $scope.quota = quota;
        $scope.lightboxes = {};
        
        $scope.search = {};
        $scope.selector = {
            loading: false
        };

        $scope.display = {
            limit: 20
        };
        
        $scope.filters = {
            itemFilter: ""
        };

        Rack.instance.sync();
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
            $scope.newFile = { 
                name: lang.translate('nofile'), 
                files: [], 
                chosenFiles: [],
                selectedGroups: [],
                selectedUsers: [],
            };
            await Rack.instance.directory.sync();
            $scope.$apply();
        };

        $scope.openMoveToDocs = async () => {
            $scope.lightboxes.copy = true;
            $scope.newFolder = new Folder("");
            await $scope.getWorkspaceFolders();
        };

        $scope.updateFoundUsersGroups = () => {
            var searchTerm =  lang.removeAccents($scope.search.search).toLowerCase();
                        
            if(!searchTerm){
                return [];
            }
            
            $scope.search.found = _.filter(Rack.instance.directory.visibles, function(item) {
                let titleTest = lang.removeAccents(item.toString()).toLowerCase();
                return titleTest.indexOf(searchTerm) !== -1;
            });
        }

        $scope.clearSearch = function(){
            if ($scope.search) {
                $scope.search.found = [];
                $scope.search.search = '';
                $scope.selector.search = '';
            }
        };

        $scope.selectGroupOrUserItem = async (item: Visible) => {
            if($scope.selector.loading) {
                return;
            }

            $scope.selector.loading = true;
            $scope.clearSearch();

            if (item instanceof Group) {
                if($scope.newFile.selectedGroups.indexOf(item) < 0) {
                    $scope.newFile.selectedGroups.push(item);
    
                    await item.sync();
                    $scope.newFile.selectedUsers = $scope.newFile.selectedUsers.concat(item.users);
                }
            } else if(item instanceof User) {
                if($scope.newFile.selectedUsers.indexOf(item) < 0) {
                    $scope.newFile.selectedUsers.push(item);
                }
            } else if(item instanceof Sharebookmark) {
                await item.sync();

                $scope.newFile.selectedGroups = $scope.newFile.selectedGroups.concat(item.groups);
                item.groups.forEach(group => $scope.newFile.selectedUsers = $scope.newFile.selectedUsers.concat(group.users));
                $scope.newFile.selectedUsers = $scope.newFile.selectedUsers.concat(item.users);
            }

            $scope.selector.loading = false;
        }

        $scope.sendRackFiles =  async () => {
            $scope.lightboxes.sendRack = false;
            $scope.loading = lang.translate('loading');
            $scope.newFile.loading = true;

            let n = $scope.newFile.files.length;
            let plurality = n > 1 ? ".plural" : "";

            let results: SendResult[] = [];
            for(let file of $scope.newFile.files){
                let result = await Rack.instance.sendFile(file, $scope.newFile.selectedUsers);
                results.push(result);
            }

            if(results.find(r => r.error !== undefined)){
                notify.error(results.find(r => r.error !== undefined).error);
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