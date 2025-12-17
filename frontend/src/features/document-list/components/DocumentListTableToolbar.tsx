import { Checkbox, Toolbar, useEdificeClient } from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import { useDocumentListStore } from "../store/documentListStore";
import { useDocumentActions } from "../hooks/useDocumentActions";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";

interface DocumentListTableToolbarProps {
  documents: RackDocumentDto[];
}

export const DocumentListTableToolbar = ({
  documents,
}: DocumentListTableToolbarProps) => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const isAllSelected = useDocumentListStore.use.isAllSelected()(documents);
  const toggleAll = useDocumentListStore.use.toggleAll();
  const selectedDocuments = useDocumentListStore.use.selectedDocuments();

  const toolbarItems = useDocumentActions(selectedDocuments.size);

  return (
    <div className="d-flex align-items-center justify-content-between gap-8 ps-16 pe-16">
      <div className="d-flex align-items-center gap-8">
        <Checkbox
          checked={isAllSelected}
          onChange={() => toggleAll(documents)}
          label={t("rack.selectAll")}
        />
        {selectedDocuments.size > 0 && (
          <span className="text-muted">({selectedDocuments.size})</span>
        )}
      </div>

      {toolbarItems.length > 0 && (
        <Toolbar
          items={toolbarItems}
          isBlock={false}
          align="right"
          variant="no-shadow"
          className="gap-4"
        />
      )}
    </div>
  );
};
