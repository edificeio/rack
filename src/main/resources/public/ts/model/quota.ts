import { model } from 'entcore';
import http from 'axios';

class Quota {
    unit: string = 'Mo';
    max: number;
    used: number;

    async sync(): Promise<void> {
        let response = await http.get('/workspace/quota/user/' + model.me.userId);
        //to mo
        let data = response.data;
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
    }
}

export const quota = new Quota();