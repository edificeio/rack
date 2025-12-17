export const RACK_WORKFLOW_RIGHTS = {
  ACCESS: "fr.wseduc.rack.controllers.RackController|view",
  CREATE_RACK: "fr.wseduc.rack.controllers.RackController|postRack",
  LIST_RACK: "fr.wseduc.rack.controllers.RackController|listRack",
  LIST_USERS: "fr.wseduc.rack.controllers.RackController|listUsers",
  COPY_WORKSPACE: "fr.wseduc.rack.controllers.RackController|rackToWorkspace",
} as const;
