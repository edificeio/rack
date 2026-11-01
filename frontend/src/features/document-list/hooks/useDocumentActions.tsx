import {
  useBreakpoint,
  useEdificeClient,
  useHasWorkflow,
} from "@edifice.io/react";
import {
  IconDelete as Delete,
  IconRestore as Restore,
  IconFolderAdd,
  IconGlobe2,
} from "@edifice.io/react/icons";
import { useTranslation } from "react-i18next";
import { useDocumentActionStore } from "~/store/documentActionStore";
import { useDocumentListStore } from "../store/documentListStore";
import type { ToolbarItem } from "@edifice.io/react";
import { RACK_WORKFLOW_RIGHTS } from "~/constants/rights.constants";
import { useCanCopyToNextcloud } from "./useCanCopyToNextcloud";
import { useCanCopyToWorkspace } from "./useCanCopyToWorkspace";

/**
 * Hook to generate toolbar items for document actions
 * @param selectedCount - Number of selected documents
 * @returns Array of toolbar items
 */
export const useDocumentActions = (selectedCount: number): ToolbarItem[] => {
  const { lg } = useBreakpoint();
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const filter = useDocumentListStore.use.filter();
  const setOpenTrashModal = useDocumentActionStore.use.setOpenTrashModal();
  const setOpenDeleteModal = useDocumentActionStore.use.setOpenDeleteModal();
  const setOpenRestoreModal = useDocumentActionStore.use.setOpenRestoreModal();
  const setOpenCopyToWorkspaceModal =
    useDocumentActionStore.use.setOpenCopyToWorkspaceModal();
  const setOpenCopyToNextcloudModal =
    useDocumentActionStore.use.setOpenCopyToNextcloudModal();
  const canAccessRack = useHasWorkflow(RACK_WORKFLOW_RIGHTS.ACCESS);
  const canCopyToWorkspace = useCanCopyToWorkspace();
  const canCopyToNextcloud = useCanCopyToNextcloud();

  const itemsTranslation = {
    delete: {
      desktop: lg ? t("rack.delete") : null,
      responsive: !lg ? t("rack.delete") : "",
    },
    restore: {
      desktop: lg ? t("rack.restore") : null,
      responsive: !lg ? t("rack.restore") : "",
    },
    copyToWorkspace: {
      desktop: lg ? t("rack.copyToWorkspace") : null,
      responsive: !lg ? t("rack.copyToWorkspace") : "",
    },
    copyToNextcloud: {
      desktop: lg ? t("rack.copyToNextcloud") : null,
      responsive: !lg ? t("rack.copyToNextcloud") : "",
    },
  };

  const items: ToolbarItem[] = [];
  if (!canAccessRack) {
    return items;
  }

  // Copy to workspace action for inbox and deposits
  if ((filter === "inbox" || filter === "deposits") && canCopyToWorkspace) {
    items.push({
      type: "button",
      name: "copyToWorkspace",
      props: {
        leftIcon: <IconFolderAdd />,
        children: itemsTranslation.copyToWorkspace.desktop,
        size: "sm",
        onClick: () => setOpenCopyToWorkspaceModal(true),
        disabled: selectedCount === 0,
        "aria-label": itemsTranslation.copyToWorkspace.responsive,
      },
      tooltip: {
        message: itemsTranslation.copyToWorkspace.responsive,
        position: "bottom",
      },
    });
  }

  if ((filter === "inbox" || filter === "deposits") && canCopyToNextcloud) {
    items.push({
      type: "button",
      name: "copyToNextcloud",
      props: {
        leftIcon: <IconGlobe2 />,
        children: itemsTranslation.copyToNextcloud.desktop,
        size: "sm",
        onClick: () => setOpenCopyToNextcloudModal(true),
        disabled: selectedCount === 0,
        "aria-label": itemsTranslation.copyToNextcloud.responsive,
      },
      tooltip: {
        message: itemsTranslation.copyToNextcloud.responsive,
        position: "bottom",
      },
    });
  }

  // Trash action for inbox and deposits
  if (filter === "inbox") {
    items.push({
      type: "button",
      name: "delete",
      props: {
        leftIcon: <Delete />,
        children: itemsTranslation.delete.desktop,
        size: "sm",
        onClick: () => setOpenTrashModal(true),
        disabled: selectedCount === 0,
        "aria-label": itemsTranslation.delete.responsive,
      },
      tooltip: {
        message: itemsTranslation.delete.responsive,
        position: "bottom",
      },
    });
  }

  // Restore and delete actions for trash
  if (filter === "trash") {
    items.push({
      type: "button",
      name: "restore",
      props: {
        leftIcon: <Restore />,
        children: itemsTranslation.restore.desktop,
        size: "sm",
        onClick: () => setOpenRestoreModal(true),
        disabled: selectedCount === 0,
        "aria-label": itemsTranslation.restore.responsive,
      },
      tooltip: {
        message: itemsTranslation.restore.responsive,
        position: "bottom",
      },
    });

    items.push({
      type: "divider",
    });

    items.push({
      type: "button",
      name: "delete",
      props: {
        leftIcon: <Delete />,
        children: itemsTranslation.delete.desktop,
        size: "sm",
        onClick: () => setOpenDeleteModal(true),
        disabled: selectedCount === 0,
        "aria-label": itemsTranslation.delete.responsive,
      },
      tooltip: {
        message: itemsTranslation.delete.responsive,
        position: "bottom",
      },
    });
  }

  return items;
};
