import { Alert, Button, Modal, useEdificeClient } from "@edifice.io/react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useDocumentActionStore } from "~/store/documentActionStore";
import { useDocumentListStore } from "../document-list/store/documentListStore";
import { useTrashRackDocument } from "~/services/queries/rack.queries";

/**
 * Modal for moving documents to trash
 * Used when deleting from inbox or deposits
 */
export const TrashDocumentModal = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const openTrashModal = useDocumentActionStore.use.openTrashModal();
  const setOpenTrashModal = useDocumentActionStore.use.setOpenTrashModal();
  const selectedDocuments = useDocumentListStore.use.selectedDocuments();
  const clearSelection = useDocumentListStore.use.clearSelection();
  const trashMutation = useTrashRackDocument();

  const selectedCount = selectedDocuments.size;
  const isPlural = selectedCount > 1;

  const handleTrash = () => {
    selectedDocuments.forEach((docId) => {
      trashMutation.mutate(docId);
    });
    setOpenTrashModal(false);
    clearSelection();
  };

  return createPortal(
    <Modal
      id="trash-document"
      isOpen={openTrashModal}
      onModalClose={() => setOpenTrashModal(false)}
    >
      <Modal.Header onModalClose={() => setOpenTrashModal(false)}>
        {isPlural
          ? t("rack.modal.trash.documents.header")
          : t("rack.modal.trash.document.header")}
      </Modal.Header>
      <Modal.Subtitle>
        {isPlural
          ? t("rack.modal.trash.documents.subtitle")
          : t("rack.modal.trash.document.subtitle")}
      </Modal.Subtitle>
      <Modal.Body>
        <Alert type="info">
          {isPlural
            ? t("rack.modal.trash.documents.info")
            : t("rack.modal.trash.document.info")}
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={() => setOpenTrashModal(false)}
        >
          {t("rack.cancel")}
        </Button>
        <Button
          type="button"
          color="danger"
          variant="filled"
          onClick={handleTrash}
          disabled={trashMutation.isPending}
        >
          {isPlural
            ? t("rack.modal.trash.documents.btn")
            : t("rack.modal.trash.document.btn")}
        </Button>
      </Modal.Footer>
    </Modal>,
    document.getElementById("portal") as HTMLElement,
  );
};
