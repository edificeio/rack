import { Button, useEdificeClient, useHasWorkflow } from "@edifice.io/react";
import { IconDepositeInbox as Upload } from "@edifice.io/react/icons";
import { useTranslation } from "react-i18next";
import { useRackStore } from "~/store/rackStore";
import { RACK_WORKFLOW_RIGHTS } from "~/constants/rights.constants";

export interface AppActionMenuOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  visibility: boolean;
  type?: "item" | "divider";
}

export function AppActionHeader() {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const setOpenedModal = useRackStore.use.setOpenedModal();
  const canUpload = useHasWorkflow(RACK_WORKFLOW_RIGHTS.CREATE_RACK);

  const handleUpload = () => {
    setOpenedModal("upload");
  };

  if (!canUpload) return null;

  return (
    <div className="d-flex flex-fill align-items-center justify-content-end gap-12 align-self-end">
      <Button
        type="button"
        color="primary"
        leftIcon={<Upload />}
        onClick={handleUpload}
      >
        {t("rack.upload")}
      </Button>
    </div>
  );
}
