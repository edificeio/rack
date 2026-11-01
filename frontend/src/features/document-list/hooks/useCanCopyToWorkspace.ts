import { useHasWorkflow } from "@edifice.io/react";
import {
  RACK_WORKFLOW_RIGHTS,
  WORKSPACE_WORKFLOW_RIGHTS,
} from "~/constants/rights.constants";

/**
 * Same rules as the media library: creating a workspace document needs the addDocument right,
 * and the personal folders, the only destinations of the folder picker, need the view right.
 * Hidden until every right is confirmed, as they resolve asynchronously.
 */
export const useCanCopyToWorkspace = (): boolean => {
  const hasRackCopyRight = useHasWorkflow(RACK_WORKFLOW_RIGHTS.COPY_WORKSPACE);
  const hasWorkspaceViewRight = useHasWorkflow(WORKSPACE_WORKFLOW_RIGHTS.VIEW);
  const hasWorkspaceAddDocumentRight = useHasWorkflow(
    WORKSPACE_WORKFLOW_RIGHTS.ADD_DOCUMENT,
  );

  return (
    !!hasRackCopyRight &&
    !!hasWorkspaceViewRight &&
    !!hasWorkspaceAddDocumentRight
  );
};
