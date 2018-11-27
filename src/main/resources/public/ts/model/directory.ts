import http from 'axios';
import { Mix } from 'entcore-toolkit';
import { idiom as lang } from 'entcore';

export class Visible{
    id: string;
    name?: string;
    groupOrUser?: string;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    toString() {
        return this.name;
    }
}

export class Group extends Visible {
    users: User[];
    structureName: string;
    isSynced: boolean;
    
    constructor(id: string, name: string, structureName: string) {
        super(id, name);
        this.groupOrUser = 'group';
        this.structureName = structureName;
    }

    async sync(){
        let response = await http.get('/rack/users/group/' + this.id);
        this.users = Mix.castArrayAs(User, response.data);
        this.users.forEach(user => {
            user.groupId = this.id;
            user.name = user.username;
        });
    }
}

export class User extends Visible {
    username: string;
    profile: string;
    groupId: string;

    constructor(id: string, name: string, profile: string) {
        super(id, name);
        this.groupOrUser = 'user';
        this.profile = profile;
    }
}

export class Sharebookmark extends Visible {
    users: User[];
    groups: Group[];
    type: string;

    constructor(id: string, name: string) {
        super(id, name);
        this.type = 'sharebookmark';
        this.groupOrUser = this.type;
    }

    async sync() {
        this.users = [];
        this.groups = [];

        let response = await http.get('/directory/sharebookmark/' + this.id);
        if(response.data && response.data.groups) {
            for (let i = 0; i < response.data.groups.length; i++) {
                const group = response.data.groups[i];
                let newGroup: Group = new Group(group.id, group.name, group.structureName);
                await newGroup.sync();
                this.groups.push(newGroup);
            }
        }
        if(response.data && response.data.users) {
            response.data.users.forEach(user => {
                if(!user.activationCode) {
                    this.users.push(new User(user.id, user.displayName, user.profile))
                }
            });
        }
    }
}

export class Directory {
    visibles: Visible[];

    async sync(){
        this.visibles = [];
        // sharebookmarks
        let response = await http.get('/directory/sharebookmark/all');
        response.data.forEach(sharebookmark => this.visibles.push(new Sharebookmark(sharebookmark.id, sharebookmark.name)));
        
        // users and groups
        response = await http.get('/rack/users/available');
        response.data.users.forEach(user => this.visibles.push(new User(user.id, user.username, user.profile)));
        response.data.groups.forEach(group => this.visibles.push(new Group(group.id, group.name, group.structureName)));
    }
}
