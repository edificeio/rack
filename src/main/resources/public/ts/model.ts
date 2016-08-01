import { model, notify, http, IModel, Model, Collection, BaseModel } from './entcore/entcore';

declare var _:any;

/// File extension format
var roleFromFileType = (fileType): string => {
    var types = {
        'doc': (type) => type.indexOf('document') !== -1 && type.indexOf('wordprocessing') !== -1,
        'xls': (type) => (type.indexOf('document') !== -1 && type.indexOf('spreadsheet') !== -1) || (type.indexOf('ms-excel') !== -1),
        'img': (type) => type.indexOf('image') !== -1,
        'pdf': (type) => type.indexOf('pdf') !== -1 || type === 'application/x-download',
        'ppt': (type) => (type.indexOf('document') !== -1 && type.indexOf('presentation') !== -1) || type.indexOf('powerpoint') !== -1,
        'video': (type) => type.indexOf('video') !== -1,
        'audio': (type) => type.indexOf('audio') !== -1
    };

    for (var type in types) {
        if (types[type](fileType)) {
            return type;
        }
    }

    return 'unknown';
};

//Deep filtering an Object based on another Object properties
//Supports "dot notation" for accessing nested objects, ex: ({a {b: 1}} can be filtered using {"a.b": 1})
var deepObjectFilter = function (object, filter) {
    for (var prop in filter) {
        var splittedProp = prop.split(".");
        var objValue = object;
        var filterValue = filter[prop];
        for (var i = 0; i < splittedProp.length; i++) {
            objValue = objValue[splittedProp[i]];
        }
        if (filterValue instanceof Object && objValue instanceof Object) {
            if (!deepObjectFilter(objValue, filterValue))
                return false;
        } else if (objValue !== filterValue)
            return false;
    }
    return true;
}

export class Quota {
    unit: string;
    max: number;
    used: number;

    sync(): Promise<any> {
        return new Promise((resolve, reject) => {
            http().get('/workspace/quota/user/' + model.me.userId).done((data) => {
                //to mo
                data.quota = data.quota / (1024 * 1024);
                data.storage = data.storage / (1024 * 1024);

                if (data.quota > 2000) {
                    data.quota = Math.round((data.quota / 1024) * 10) / 10;
                    data.storage = Math.round((data.storage / 1024) * 10) / 10;
                    this.unit = 'Go';
                }
                else {
                    data.quota = Math.round(data.quota);
                    data.storage = Math.round(data.storage);
                }

                this.max = data.quota;
                this.used = data.storage;

                resolve();
            });
        });
    }
}

export class RackFile extends Model implements IModel{
    _id: string;
    metadata: {
        contentType: string
    }
    
    get api(){
        return {
            get: '/rack/list',
            delete: '/rack/:id'
        }
    }

    constructor(data: any) {
        super(data);

        this.metadata.contentType = roleFromFileType(data.metadata['content-type'])
    }
    
    trash(){
        return http().put('/rack/' + this._id + '/trash')
            .done(() => notify.info('rack.notify.trashed'));
    }
    
    restore(){
        return http().put('/rack/' + this._id + '/recover')
            .done(() => notify.info('rack.notify.restored'));
    }
}

export class VisibleGroup extends Model {
    id: string;
    name: string;
}

export class VisibleUser extends Model {
    id: string;
    visibleGroups: Collection<VisibleGroup>;
    
    constructor(data: any){
        super(data);
        
        this.collection(VisibleGroup);
        this.visibleGroups.load(data.groups);
        rack.directory.visibleGroups.addRange(_.reject(this.visibleGroups.all, (g) =>
            _.findWhere(rack.directory.visibleGroups.all, { id: g.id }) !== undefined
        ));
    }
}

export class Directory extends Model{
    visibleUsers: Collection<VisibleUser>;
    visibleGroups: Collection<VisibleGroup>;
    
    constructor(){
        super();
        
        var directory = this;
        this.collection(VisibleGroup);
        this.collection(VisibleUser, {
            sync: function () {
                http().get("/rack/users/available").done((users) => {
                    rack.directory.visibleGroups.all = [];
                    this.load(users);
                    directory.trigger('sync');
                });
            }
        })
    }
}

export class Folder extends Model {
    path: string;
    name: string;
    _id: string;
    children: Folder[];
    parent: string;

    constructor(path: string) {
        super(path);

        var foldersChain = path.split('_');
        this.name = foldersChain[foldersChain.length - 1];
        this.path = path;
        if (foldersChain.length > 1) {
            this.parent = foldersChain[foldersChain.length - 2];
        }
        this.children = [];
    }

    toJSON() {
        return {
            path: this.path,
            name: this.name
        };
    }

    create(): Promise<Folder> {
        return new Promise((resolve, reject) => {
            http().post('/workspace/folder', this.toJSON()).done((newFolder) => {
                this._id = newFolder._id;
                resolve(this);
            })
            .error(() => {
                reject(this);
            });
        });
        
    }
}

class RackFilesCollection {
    selection: () => RackFile[];
    sync: any;
    all: RackFile[];

    constructor() {
        this.sync = "rack/list";
    }

    deepFilter(obj: any) {
        return _.filter(this.all, deepObjectFilter);
    }

    trashSelection () {
        var parsedCount = 0
        this.selection().forEach((item) => {
            item.trash().done(() => {
                if (++parsedCount === this.selection().length) {
                    if (this.selection().length > 1) {
                        notify.info('rack.notify.trashed.plural');
                    }
                    else {
                        notify.info('rack.notify.trashed');
                    }
                    this.sync();
                }
            });
        });
    }

    delete (hook?: () => void) {
        var parsedCount = 0
        this.selection().forEach(function (item) {
            item.remove().done(() => {
                if (++parsedCount === this.selection().length) {
                    if (this.selection().length > 1) {
                        notify.info('rack.notify.deleted.plural');
                    }
                    else {
                        notify.info('rack.notify.deleted');
                    }

                    this.sync()
                    if (hook !== undefined) {
                        hook();
                    }
                }
            });
        });
    }

    restore () {
        var parsedCount = 0;
        this.selection().forEach((item) => {
            item.restore().done(() => {
                if (++parsedCount === this.selection().length) {
                    if (this.selection().length > 1) {
                        notify.info('rack.notify.restored.plural');
                    }
                    else {
                        notify.info('rack.notify.restored');
                    }
                    this.sync()
                }
            })
        })
    }

    copyToWorkspace (folder) {
        return http().postJson('rack/copy', { ids: _.pluck(this.selection(), '_id'), folder: folder }).done(() => {
            if (this.selection().length > 1) {
                notify.info('rack.notify.copyToWorkspace.plural');
            }
            else {
                notify.info('rack.notify.copyToWorkspace');
            }
        });
    }
}

class FoldersCollection {
    empty: () => void;
    push: (item: Folder, notify?: boolean) => void;
    findWhere: (props: any) => Folder;
    sync: any;
    all: Folder[];
    trigger: (eventName: string) => void;

    constructor() {
        this.sync = this.syncFolders;
    }

    deepFilter(filter: any) {
        return _.filter(this.all, (item) => {
            return deepObjectFilter(item, filter);
        });
    }

    syncFolders(hook?: () => void) {
        this.all.splice(0, this.all.length);
        http().get("/workspace/folders?filter=owner").done((folders) => {
            var foldersList = [];
            folders.forEach((path) => {
                if (path.indexOf('Trash') !== -1) {
                    return;
                }
                foldersList.push(new Folder(path));
            });

            foldersList.forEach((folder) => {
                if (!folder.parent) {
                    this.push(folder, false);
                }
                else {
                    _.findWhere(foldersList, { name: folder.parent }).children.push(folder);
                }
            });
            if (hook) {
                hook()
            }
            this.trigger('change');
        });
    }
}

export interface RackFiles extends Collection<RackFile>, RackFilesCollection { }
export interface Folders extends Collection<Folder>, FoldersCollection { }

export class Rack extends Model{
    rackFiles: RackFiles;
    folders: Folders;
    directory: Directory;
 
    constructor(){
        super();
        this.directory = new Directory();
        this.filesCollection();
        this.foldersCollection();
    }

    foldersCollection() {
        this.collection(Folder, new FoldersCollection());
    }
    
    filesCollection() {
        this.collection(RackFile, new RackFilesCollection);
    }

    sendFile(file: File, to: string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            var formData = new FormData();

            formData.append('file', file)
            formData.append('users', _.pluck(to, "id").join(","))
            
            
            http().postFile('/rack?thumbnail=120x120', formData, { requestName: 'file-upload' })
                .done((r) => {
                    if (r.success === 0) {
                        reject(r);
                        return;
                    }
                    else {
                        resolve(r);
                    }
                });
        });
    }
 
    sync(){
        this.rackFiles.sync();
    }
}

export var rack = new Rack();

model.build = function () {
    rack.sync();
}