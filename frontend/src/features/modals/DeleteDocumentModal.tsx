import { Alert, Button, Modal, useEdificeClient } from "@edifice.io/react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useDocumentActionStore } from "~/store/documentActionStore";
import { useDocumentListStore } from "../document-list/store/documentListStore";
import { useDeleteRackDocument } from "~/services/queries/rack.queries";

/**
 * Modal for permanently deleting documents
 * Used when deleting from trash (permanent deletion)
 */
export const DeleteDocumentModal = () => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const openDeleteModal = useDocumentActionStore.use.openDeleteModal();
  const setOpenDeleteModal = useDocumentActionStore.use.setOpenDeleteModal();
  const selectedDocuments = useDocumentListStore.use.selectedDocuments();
  const clearSelection = useDocumentListStore.use.clearSelection();
  const deleteMutation = useDeleteRackDocument();

  const selectedCount = selectedDocuments.size;
  const isPlural = selectedCount > 1;

  const handleDelete = () => {
    selectedDocuments.forEach((docId) => {
      deleteMutation.mutate(docId);
    });
    setOpenDeleteModal(false);
    clearSelection();
  };

  return createPortal(
    <Modal
      id="delete-document"
      isOpen={openDeleteModal}
      onModalClose={() => setOpenDeleteModal(false)}
    >
      <Modal.Header onModalClose={() => setOpenDeleteModal(false)}>
        {isPlural
          ? t("rack.modal.delete.documents.header")
          : t("rack.modal.delete.document.header")}
      </Modal.Header>
      <Modal.Subtitle>
        {isPlural
          ? t("rack.modal.delete.documents.subtitle")
          : t("rack.modal.delete.document.subtitle")}
      </Modal.Subtitle>
      <Modal.Body>
        <Alert type="danger">
          {isPlural
            ? t("rack.modal.delete.documents.warning")
            : t("rack.modal.delete.document.warning")}
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          color="tertiary"
          variant="ghost"
          onClick={() => setOpenDeleteModal(false)}
        >
          {t("rack.cancel")}
        </Button>
        <Button
          type="button"
          color="danger"
          variant="filled"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {isPlural
            ? t("rack.modal.delete.documents.btn")
            : t("rack.modal.delete.document.btn")}
        </Button>
      </Modal.Footer>
    </Modal>,
    document.getElementById("portal") as HTMLElement,
  );
};
