import { Button, Modal, useEdificeClient } from "@edifice.io/react";
import { NextcloudFolders } from "@edifice.io/react/multimedia";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";
import { useCopyRackDocumentsToNextcloud } from "~/services/queries/rack.queries";

interface AddRackDocumentToNextcloudModalProps {
  documents: RackDocumentDto[];
  onModalClose: () => void;
}

export const AddRackDocumentToNextcloudModal = ({
  documents,
  onModalClose,
}: AddRackDocumentToNextcloudModalProps) => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const [selectedPath, setSelectedPath] = useState<string>();
  const copyToNextcloud = useCopyRackDocumentsToNextcloud();

  const handleAddToNextcloud = () => {
    if (selectedPath === undefined) return;
    const ids = documents.flatMap((doc) => (doc._id ? [doc._id] : []));
    copyToNextcloud.mutate(
      { ids, path: selectedPath },
      {
        onSuccess: ({ data }) => {
          if (data.some((result) => result.status === "ok")) onModalClose();
        },
      },
    );
  };

  return createPortal(
    <Modal
      isOpen
      onModalClose={onModalClose}
      id="add-rack-document-to-nextcloud-modal"
      size="md"
    >
      <Modal.Header onModalClose={onModalClose}>
        {t("rack.modal.addToNextcloud.title")}
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column gap-12">
          <p>{t("rack.modal.addToNextcloud.description")}</p>
          <NextcloudFolders
            onFolderSelected={setSelectedPath}
            loginDescription={t("rack.modal.addToNextcloud.login")}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={onModalClose}
        >
          {t("rack.modal.addToNextcloud.cancel")}
        </Button>
        <Button
          type="submit"
          color="primary"
          variant="filled"
          onClick={handleAddToNextcloud}
          disabled={selectedPath === undefined || copyToNextcloud.isPending}
          isLoading={copyToNextcloud.isPending}
        >
          {t("rack.modal.addToNextcloud.add")}
        </Button>
      </Modal.Footer>
    </Modal>,
    document.getElementById("portal") as HTMLElement,
  );
};
