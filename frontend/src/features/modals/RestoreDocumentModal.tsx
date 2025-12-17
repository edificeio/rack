import { Button, Modal, useEdificeClient } from "@edifice.io/react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useDocumentActionStore } from "~/store/documentActionStore";
import { useDocumentListStore } from "../document-list/store/documentListStore";
import { useRestoreRackDocument } from "~/services/queries/rack.queries";

export const RestoreDocumentModal = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const openRestoreModal = useDocumentActionStore.use.openRestoreModal();
  const setOpenRestoreModal = useDocumentActionStore.use.setOpenRestoreModal();
  const selectedDocuments = useDocumentListStore.use.selectedDocuments();
  const clearSelection = useDocumentListStore.use.clearSelection();
  const restoreMutation = useRestoreRackDocument();

  const selectedCount = selectedDocuments.size;
  const isPlural = selectedCount > 1;

  const handleRestore = () => {
    selectedDocuments.forEach((docId) => {
      restoreMutation.mutate(docId);
    });
    setOpenRestoreModal(false);
    clearSelection();
  };

  return createPortal(
    <Modal
      id="restore-document"
      isOpen={openRestoreModal}
      onModalClose={() => setOpenRestoreModal(false)}
    >
      <Modal.Header onModalClose={() => setOpenRestoreModal(false)}>
        {isPlural
          ? t("rack.modal.restore.documents.header")
          : t("rack.modal.restore.document.header")}
      </Modal.Header>
      <Modal.Subtitle>
        {isPlural
          ? t("rack.modal.restore.documents.subtitle")
          : t("rack.modal.restore.document.subtitle")}
      </Modal.Subtitle>
      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={() => setOpenRestoreModal(false)}
        >
          {t("rack.cancel")}
        </Button>
        <Button
          type="button"
          color="primary"
          variant="filled"
          onClick={handleRestore}
          disabled={restoreMutation.isPending}
        >
          {isPlural
            ? t("rack.modal.restore.documents.btn")
            : t("rack.modal.restore.document.btn")}
        </Button>
      </Modal.Footer>
    </Modal>,
    document.getElementById("portal") as HTMLElement,
  );
};
