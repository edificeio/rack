import { useHasWorkflow, usePublicConf } from "@edifice.io/react";
import { NEXTCLOUD_WORKFLOW_RIGHTS } from "~/constants/rights.constants";

type WorkspacePublicConf = {
  "folder-service"?: string[];
};

/**
 * Nextcloud is offered only where the platform enables it as a workspace folder service,
 * and only to users having the Nextcloud access right (same rule as the media library tab).
 */
export const useCanCopyToNextcloud = (): boolean => {
  const hasNextcloudViewRight = useHasWorkflow(NEXTCLOUD_WORKFLOW_RIGHTS.VIEW);
  const { data: workspacePublicConf } =
    usePublicConf<WorkspacePublicConf>("workspace");

  return (
    !!hasNextcloudViewRight &&
    !!workspacePublicConf?.["folder-service"]?.includes("nextcloud")
  );
};
