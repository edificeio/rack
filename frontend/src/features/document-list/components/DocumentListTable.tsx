import { LoadingScreen, Table } from "@edifice.io/react";
import { useRackDocuments } from "~/services/queries/rack.queries";
import { useFilteredDocuments } from "../hooks/useFilteredDocuments";
import { useDocumentListSort } from "../hooks/useDocumentListSort";
import { useDocumentListStore } from "../store/documentListStore";
import { RackEmptyScreen, TrashEmptyScreen } from "~/features/empty-screen";
import { DocumentListTableHead } from "./DocumentListTableHead";
import { DocumentListTableToolbar } from "./DocumentListTableToolbar";
import { DocumentListTableBody } from "./DocumentListTableBody";
import { AddRackDocumentToWorkspaceModal } from "./AddRackDocumentToWorkspaceModal";
import { useDocumentActionStore } from "~/store/documentActionStore";

export const DocumentListTable = () => {
  const { data: documents, isLoading } = useRackDocuments();
  const filter = useDocumentListStore.use.filter();
  const { filteredDocuments, isLoading: isFilterLoading } =
    useFilteredDocuments(documents, filter);

  const { sortedDocuments } = useDocumentListSort(filteredDocuments, filter);

  const isLoadingAny = isLoading || isFilterLoading;

  const openCopyToWorkspaceModal =
    useDocumentActionStore.use.openCopyToWorkspaceModal();
  const setOpenCopyToWorkspaceModal =
    useDocumentActionStore.use.setOpenCopyToWorkspaceModal();
  const selectedDocuments = useDocumentListStore.use.selectedDocuments();

  const selectedDocs = sortedDocuments.filter((doc) =>
    selectedDocuments.has(doc._id || doc.file),
  );
  // Show empty screen if no documents in inbox or deposits
  if (!isLoadingAny && sortedDocuments.length === 0) {
    if (filter === "trash") {
      return <TrashEmptyScreen />;
    }
    return <RackEmptyScreen />;
  }

  return (
    <>
      <div id="documents-table" className="documents-table">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <DocumentListTableHead />
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            <Table.Tr>
              <td colSpan={4} className="py-0" style={{ height: "49px" }}>
                <DocumentListTableToolbar documents={sortedDocuments} />
              </td>
            </Table.Tr>

            {isLoadingAny && (
              <Table.Tr>
                <td colSpan={4}>
                  <LoadingScreen />
                </td>
              </Table.Tr>
            )}

            <DocumentListTableBody documents={sortedDocuments} />
          </Table.Tbody>
        </Table>
      </div>

      <AddRackDocumentToWorkspaceModal
        documents={selectedDocs}
        isOpen={openCopyToWorkspaceModal}
        onModalClose={() => setOpenCopyToWorkspaceModal(false)}
      />
    </>
  );
};
