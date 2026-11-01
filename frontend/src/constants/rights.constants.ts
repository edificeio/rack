export const RACK_WORKFLOW_RIGHTS = {
  ACCESS: "fr.wseduc.rack.controllers.RackController|view",
  CREATE_RACK: "fr.wseduc.rack.controllers.RackController|postRack",
  LIST_RACK: "fr.wseduc.rack.controllers.RackController|listRack",
  LIST_USERS: "fr.wseduc.rack.controllers.RackController|listUsers",
  COPY_WORKSPACE: "fr.wseduc.rack.controllers.RackController|rackToWorkspace",
} as const;

export const WORKSPACE_WORKFLOW_RIGHTS = {
  VIEW: "org.entcore.workspace.controllers.WorkspaceController|view",
  ADD_DOCUMENT:
    "org.entcore.workspace.controllers.WorkspaceController|addDocument",
} as const;

export const NEXTCLOUD_WORKFLOW_RIGHTS = {
  VIEW: "fr.openent.nextcloud.controller.NextcloudController|view",
} as const;
