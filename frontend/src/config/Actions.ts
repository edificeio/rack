/**
 * Application actions configuration
 * Defines available actions and their properties
 */
export interface ActionConfig {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Actions {
  document: {
    upload: ActionConfig;
    download: ActionConfig;
    delete: ActionConfig;
    share: ActionConfig;
  };
}

const actions: Actions = {
  document: {
    upload: {
      id: "document.upload",
      name: "Upload",
      icon: "upload",
      color: "primary",
    },
    download: {
      id: "document.download",
      name: "Download",
      icon: "download",
    },
    delete: {
      id: "document.delete",
      name: "Delete",
      icon: "delete",
      color: "danger",
    },
    share: {
      id: "document.share",
      name: "Share",
      icon: "share",
    },
  },
};

export default actions;
