import { deepObjectFilter } from './util';
import { Selection, Selectable } from 'toolkit';
import { Rack } from './rack';
import http from 'axios';

export class Folder implements Selectable {
    path: string;
    name: string;
    _id: string;
    children: Folder[];
    parent: string;
    selected: boolean;

    constructor(path: string) {
        let foldersChain = path.split('_');
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

    async create(): Promise<void> {
        let formData = new FormData();
        formData.append('name', this.name);
        formData.append('path', this.path);
        let response = await http.post('/workspace/folder', formData);
        this._id = response.data._id;
    }
}

export class Folders {
    all: Folder[];
    selection: Selection<Folder>;

    constructor() {
        this.all = [];
        this.selection = new Selection(this.all);
    }

    deepFilter(filter: any) {
        return _.filter(this.all, (item) => {
            return deepObjectFilter(item, filter);
        });
    }

    push(folder: Folder){
        this.all.push(folder);
    }

    async sync(): Promise<void> {
        this.all.splice(0, this.all.length);
        let response = await http.get("/workspace/folders?filter=owner");
        let foldersList = [];
        response.data.forEach((path) => {
            if (path.indexOf('Trash') !== -1) {
                return;
            }
            foldersList.push(new Folder(path));
        });

        foldersList.forEach((folder) => {
            if (!folder.parent) {
                this.push(folder);
            }
            else {
                _.findWhere(foldersList, { name: folder.parent }).children.push(folder);
            }
        });

        Rack.instance.eventer.trigger('sync');
    }
}