import {
  Table,
  Checkbox,
  Avatar,
  Flex,
  useEdificeClient,
} from "@edifice.io/react";
import { useTranslation } from "react-i18next";
import { useDocumentListStore } from "../store/documentListStore";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";

interface DocumentListTableBodyProps {
  documents: RackDocumentDto[];
}

export const DocumentListTableBody = ({
  documents,
}: DocumentListTableBodyProps) => {
  const { appCode } = useEdificeClient();
  const { t } = useTranslation(appCode);
  const selectedDocuments = useDocumentListStore.use.selectedDocuments();
  const toggleDocument = useDocumentListStore.use.toggleDocument();
  const filter = useDocumentListStore.use.filter();

  const getAvatarURL = (userId?: string) => {
    if (!userId) return undefined;
    return `/avatar/${userId}`;
  };

  /**
   * Get person data (avatar and name) based on filter
   * @param doc The document
   * @returns Object with userId and displayName
   */
  const getPersonData = (doc: RackDocumentDto) => {
    switch (filter) {
      case "deposits":
        return {
          userId: doc.to,
          displayName: doc.toName,
        };
      case "inbox":
      case "trash":
      default:
        return {
          userId: doc.from,
          displayName: doc.fromName,
        };
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <Table.Tr>
        <td colSpan={4} className="text-center py-24">
          {t("rack.noDocuments")}
        </td>
      </Table.Tr>
    );
  }

  return (
    <>
      {documents.map((doc: RackDocumentDto) => {
        const docId = doc._id || doc.file;
        const isSelected = selectedDocuments.has(docId);
        const personData = getPersonData(doc);

        return (
          <Table.Tr key={docId}>
            <Table.Td className="ps-16">
              <Checkbox
                checked={isSelected}
                onChange={() => toggleDocument(docId)}
              />
            </Table.Td>
            <Table.Td>
              <a
                href={`/rack/get/${docId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {doc.name}
              </a>
            </Table.Td>
            <Table.Td>
              <Flex align="center" gap="8">
                <Avatar
                  src={getAvatarURL(personData.userId)}
                  size="xs"
                  variant="circle"
                  alt={personData.displayName}
                />
                <span className="fw-bold">{personData.displayName}</span>
              </Flex>
            </Table.Td>
            <Table.Td>{new Date(doc.sent).toLocaleDateString()}</Table.Td>
          </Table.Tr>
        );
      })}
    </>
  );
};
