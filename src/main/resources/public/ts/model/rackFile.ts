import { Document, notify } from 'entcore';
import { deepObjectFilter } from './util';
import { Selection, Selectable, Mix, Provider } from 'entcore-toolkit';
import http from 'axios';

export class RackFile implements Selectable {
  _id: string;
  selected: boolean;
  metadata: {
    contentType: string;
  };
  folder: string;
  name?: string;
  synced?: boolean;

  async getBlob(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/rack/get/" + this._id, true);
      xhr.responseType = "blob";
      xhr.onload = function (e) {
        if (xhr.status == 200) {
          resolve(xhr.response);
        } else {
          reject("Failed with status code: " + xhr.status);
        }
      };
      xhr.send();
    });
  }

  fromJSON(data: any) {
    this.metadata.contentType = Document.role(data.metadata["content-type"]);
  }

  async delete(): Promise<void> {
    await http.delete("/rack/" + this._id);
  }

  async trash(): Promise<void> {
    this.folder = "Trash";
    await http.put("/rack/" + this._id + "/trash");
  }

  async restore(): Promise<void> {
    this.folder = "";
    await http.put("/rack/" + this._id + "/recover");
  }
}

export class RackFiles {
    all: RackFile[];
    selection: Selection<RackFile>;
    provider: Provider<RackFile>;

    constructor() {
        this.all = [];
        this.selection = new Selection(this.all);
        this.provider = new Provider("rack/list", RackFile);
    }

    deepFilter(obj: any) {
        return _.filter(this.all, deepObjectFilter);
    }

    async trashSelection() {
        if (this.selection.length > 1) {
            notify.info('rack.notify.trashed.plural');
        }
        else {
            notify.info('rack.notify.trashed');
        }
        for (let file of this.selection.selected) {
            await file.trash();
        }
    }

    async delete() {
        if (this.selection.length > 1) {
            notify.info('rack.notify.deleted.plural');
        }
        else {
            notify.info('rack.notify.deleted');
        }

        for (let rackFile of this.selection.selected) {
            await rackFile.delete();
        }
        this.selection.removeSelection();
        this.provider.isSynced = false;
    }

    async restore() {
        if (this.selection.length > 1) {
            notify.info('rack.notify.restored.plural');
        }
        else {
            notify.info('rack.notify.restored');
        }

        for (let rackFile of this.selection.selected) {
            await rackFile.restore();
        }
    }

    async sync() {
        this.all = await this.provider.data();
        this.selection = new Selection(this.all);
    }

    async toFolderPickerSources(): Promise<{ action: string, title: string, content: Blob }[]> {
        const selection = this.selection.selected;
        const names = selection.map(s => s.name);
        const blobs = await Promise.all(selection.map(s => s.getBlob()));
        const results: { action: string, title: string, content: Blob }[] = []
        for (let i = 0; i < blobs.length; i++) {
            const content = blobs[i];
            results.push({
                action: "create-from-blob",
                title: names[i],
                content
            })
        }
        return results;
    }
}