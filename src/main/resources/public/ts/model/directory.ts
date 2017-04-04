import http from 'axios';
import { Rack } from './rack';
import { Mix } from 'toolkit';

export class Visible{
    id: string;
    name?: string;
    username?: string;
}

export class Group extends Visible {
    users: User[];
    isSynced: boolean;

    async sync(){
        if(this.isSynced){
            return;
        }
        let response = await http.get('/rack/users/group/' + this.id);
        this.users = Mix.castArrayAs(User, response.data);
        this.isSynced = true;
    }
}

export class User extends Visible {

}

export class Directory {
    visibles: Visible[];
    found: Visible[];
    
    
    async sync(){
        let response = await http.get('/rack/users/available');
        this.visibles = Mix.castArrayAs(User, response.data.users)
            .concat(
                Mix.castArrayAs(Group, response.data.groups)
            );
        Rack.instance.eventer.trigger('directory.sync');
    }

    constructor(){
        this.visibles = [];
    }

    search(text: string){
        let lowerText = text.toLowerCase();
        this.found = this.visibles.filter((v) => 
            (v.username || v.name).toLowerCase().indexOf(lowerText) !== -1
        );
        this.found.sort((v1, v2) => (v1.username || v1.name).localeCompare(v2.username || v2.name));
    }
}