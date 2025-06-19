import { Directory } from "./directory";
import { RackFiles } from "./rackFile";
import { Eventer } from "entcore-toolkit";
import { quota } from "./quota";
import http from "axios";
import { getCurrentUserClassname } from "./util";

export interface SendResult {
  success: number;
  failure: number;
  error: string;
}

export class Rack {
  files: RackFiles;
  directory: Directory;
  eventer: Eventer;
  filters: any;

  private static _instance: Rack;

  static get instance(): Rack {
    if (!this._instance) {
      this._instance = new Rack();
    }
    return this._instance;
  }

  constructor() {
    this.directory = new Directory();
    this.files = new RackFiles();
    this.eventer = new Eventer();

    this.filters = {
      mine: (item) => item.to === model.me.userId && item.folder !== "Trash",
      history: (item) => item.from === model.me.userId,
      trash: (item) => item.to === model.me.userId && item.folder === "Trash",
    };
  }

  async sendFile(file: File, to: string[]): Promise<SendResult> {
    this.files.provider.isSynced = false;
    let formData = new FormData();

    // Remove excluded users from to-list
    let filteredTo: any[] = _.reject(to, function (user) {
      return user.exclude;
    });

    const { className } = getCurrentUserClassname();

    formData.append("file", file);
    formData.append("users", _.pluck(filteredTo, "id").join(","));
    if (className) {
      formData.append("className", className);
    }

    try {
      let response = await http.post("/rack?thumbnail=120x120", formData);

      filteredTo.forEach(async (user) => {
        let pathValue = "/";
        let urlParam = `?path=${encodeURIComponent(pathValue)}`;
        let testResponse = await http.get(
          `/nextcloud/files/user/${user.id}` + urlParam
        );
      });

      return response.data;
    } catch (e) {
      console.log(e);
      return {
        success: 0,
        failure: to.length,
        error: e.response.data.error,
      };
    }
  }
  async sync() {
    await quota.sync();
    await this.files.sync();
    this.eventer.trigger("sync");
  }
}
