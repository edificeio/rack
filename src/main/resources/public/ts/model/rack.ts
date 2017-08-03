import { Directory } from './directory';
import { RackFiles } from './rackFile';
import { Folders } from './folder';
import { Eventer } from 'entcore-toolkit';
import { quota } from './quota';
import http from 'axios';

export interface SendResult{
    success: number;
    failure: number;
}

export class Rack{
    files: RackFiles;
    folders: Folders;
    directory: Directory;
    eventer: Eventer;
    filters: any;
 
    private static _instance: Rack;

    static get instance(): Rack{
        if(!this._instance){
            this._instance = new Rack();
        }
        return this._instance;
    }

    constructor(){
        this.directory = new Directory();
        this.files = new RackFiles();
        this.folders = new Folders();
        this.eventer = new Eventer();

        this.filters = {
            mine: (item) => item.to === model.me.userId && item.folder !== "Trash",
            history: (item) => item.from === model.me.userId,
            trash: (item) => item.to === model.me.userId && item.folder === "Trash"
        }
    }

    async sendFile(file: File, to: string[]): Promise<SendResult> {
        this.files.provider.isSynced = false;
        let formData = new FormData();

        formData.append('file', file);
        formData.append('users', _.pluck(to, "id").join(","));

        try{
            let response = await http.post('/rack?thumbnail=120x120', formData);
            return response.data;
        }
        catch(e){
            console.log(e);
            return {
                success: 0,
                failure: to.length
            };
        }
    }
 
    async sync(){
        await quota.sync()
        await this.files.sync();
        this.eventer.trigger('sync');
    }
}