import { notify, idiom as lang, template, FolderPickerProps, ng, $ } from 'entcore';
import { Rack, Visible, User, Group, quota, SendResult, Sharebookmark } from '../model';
import { moment } from 'entcore';

export interface RackScope {
    rackList: any
    visibles: any
    template: any
    lang: any
    quota: any
    lightboxes: any
    search: any
    selector: any
    display: any
    filters: any
    newFile: any
    loading: string
    copyProps: FolderPickerProps;
    longDate(str: string): string
    openNewRack()
    openMoveToDocs()
    updateFoundUsersGroups()
    clearSearch()
    selectGroupOrUserItem(item: Visible)
    sendRackFiles()
    //
    $apply()
}
export let rackController = ng.controller('RackController', [
    '$scope', 'route', 'model',
    function ($scope: RackScope, route, model) {
        $scope.rackList = Rack.instance.files;
        $scope.visibles = Rack.instance.directory.visibles;
        $scope.template = template;
        $scope.lang = lang;
        $scope.quota = quota;
        $scope.lightboxes = {};
        $scope.copyProps = {
            i18: {
                title: "rack.copy.title",
                actionTitle: "rack.copy.action",
                actionProcessing: "rack.copy.processing",
                actionFinished: "rack.copy.finished",
                info: "rack.copy.info"
            },
            sources: [],
            onCancel() {
                $scope.lightboxes.copy = false;
            },
            onSubmitSuccess(dest, count: number) {
                if (count > 1) {
                    notify.info('rack.notify.copyToWorkspace.plural');
                } else {
                    notify.info('rack.notify.copyToWorkspace');
                }
                $scope.lightboxes.copy = false;
            }
        }

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
        Rack.instance.eventer.on('sync', () => {
            $scope.$apply()
        });

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
            const sources = await Rack.instance.files.toFolderPickerSources();
            console.log("res ",sources.length)
            $scope.lightboxes.copy = true;
            $scope.copyProps.sources = sources;
            $scope.$apply();
        };

        $scope.updateFoundUsersGroups = () => {
            var searchTerm = lang.removeAccents($scope.search.search).toLowerCase();

            if (!searchTerm) {
                return [];
            }

            $scope.search.found = _.filter(Rack.instance.directory.visibles, function (item) {
                let titleTest = lang.removeAccents(item.toString()).toLowerCase();
                return titleTest.indexOf(searchTerm) !== -1;
            });
        }

        $scope.clearSearch = function () {
            if ($scope.search) {
                $scope.search.found = [];
                $scope.search.search = '';
                $scope.selector.search = '';
            }

            if ($scope.newFile.selectedGroups && !$scope.selector.selectedGroup) {
                clearSelectedList(undefined);
            } else {
                $scope.selector.selectedGroup = false;
            }

            $('[data-drop-down]').height("");
            $('[data-drop-down]').addClass('hidden');
        };

        $scope.selectGroupOrUserItem = async (item: Visible) => {
            if ($scope.selector.loading) {
                return;
            }

            $scope.selector.loading = true;
            $scope.clearSearch();

            if (item instanceof Group) {
                if ($scope.newFile.selectedGroups.indexOf(item) < 0) {
                    $scope.newFile.selectedGroups.push(item);

                    await item.sync();
                    $scope.newFile.selectedUsers = $scope.newFile.selectedUsers.concat(item.users);
                }
            } else if (item instanceof User) {
                if ($scope.newFile.selectedUsers.indexOf(item) < 0) {
                    $scope.newFile.selectedUsers.push(item);
                }
            } else if (item instanceof Sharebookmark) {
                await item.sync();

                $scope.newFile.selectedGroups = $scope.newFile.selectedGroups.concat(item.groups);
                item.groups.forEach(group => $scope.newFile.selectedUsers = $scope.newFile.selectedUsers.concat(group.users));
                $scope.newFile.selectedUsers = $scope.newFile.selectedUsers.concat(item.users);
            }

            $scope.selector.loading = false;
        }

        $scope.sendRackFiles = async () => {
            $scope.lightboxes.sendRack = false;
            $scope.loading = lang.translate('loading');
            $scope.newFile.loading = true;

            let n = $scope.newFile.files.length;
            let plurality = n > 1 ? ".plural" : "";

            let results: SendResult[] = [];
            for (let file of $scope.newFile.files) {
                let result = await Rack.instance.sendFile(file, $scope.newFile.selectedUsers);
                results.push(result);
            }

            if (results.find(r => r.error !== undefined)) {
                notify.error(results.find(r => r.error !== undefined).error);
            }

            if (!results.find(r => r.success > 0)) {
                notify.error('rack.sent.message.error' + plurality);
            }
            else if (!results.find(r => r.failure > 0)) {
                notify.info('rack.sent.message' + plurality);
            }
            else if (results.find(r => r.success > 0)) {
                notify.error('rack.sent.message.partial' + plurality);
            }

            $scope.newFile.loading = false;
            await Rack.instance.sync();
            $scope.$apply();
        }

        function clearSelectedList(selectedGroupItem) {
            _.forEach($scope.newFile.selectedGroups, group => {
                if (selectedGroupItem && selectedGroupItem._id === group._id) return;
                group.selected = false;
            });

            _.forEach($scope.newFile.selectedUsers, user => {
                user.selected = false;
            });
        }
    }
]);