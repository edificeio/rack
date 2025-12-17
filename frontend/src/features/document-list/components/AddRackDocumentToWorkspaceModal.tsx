import { Button, Modal, useEdificeClient } from "@edifice.io/react";
import { WorkspaceFolders } from "@edifice.io/react/multimedia";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useRackDocumentActions } from "../hooks/useRackDocumentActions";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";

interface AddRackDocumentToWorkspaceModalProps {
  documents: RackDocumentDto[];
  onModalClose: () => void;
  isOpen?: boolean;
}

export const AddRackDocumentToWorkspaceModal = ({
  documents,
  isOpen = false,
  onModalClose,
}: AddRackDocumentToWorkspaceModalProps) => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const { sendDocumentsToWorkspace } = useRackDocumentActions();
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const handleFolderSelected = (folderId: string, canCopyFileInto: boolean) => {
    setSelectedFolderId(canCopyFileInto ? folderId : undefined);
  };

  const handleAddToWorkspace = async () => {
    if (selectedFolderId === undefined) return;
    setIsLoading(true);
    const isSuccess = await sendDocumentsToWorkspace(
      documents,
      selectedFolderId,
    );
    if (isSuccess) {
      onModalClose();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setDisabled(selectedFolderId === undefined);
  }, [selectedFolderId]);

  return createPortal(
    <Modal
      isOpen={isOpen}
      onModalClose={onModalClose}
      id="add-rack-document-to-workspace-modal"
      size="md"
    >
      <Modal.Header onModalClose={onModalClose}>
        {t("rack.modal.addToWorkspace.title")}
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-12">
          <p>
            {t("rack.modal.addToWorkspace.description", {
              count: documents.length,
            })}
          </p>
          <WorkspaceFolders onFolderSelected={handleFolderSelected} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={onModalClose}
        >
          {t("rack.modal.addToWorkspace.cancel")}
        </Button>
        <Button
          type="submit"
          color="primary"
          variant="filled"
          onClick={handleAddToWorkspace}
          disabled={isLoading || disabled}
          isLoading={isLoading}
        >
          {t("rack.modal.addToWorkspace.add")}
        </Button>
      </Modal.Footer>
    </Modal>,
    document.getElementById("portal") as HTMLElement,
  );
};
