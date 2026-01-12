import { useUser } from "@edifice.io/react";
import { useEffect, useState } from "react";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";

export type DocumentFilter = "inbox" | "deposits" | "trash";

/**
 * Hook to filter documents based on current filter and user rights
 * @param documents - The documents to filter
 * @param filter - The current filter type
 * @returns The filtered documents and a loading state
 */
export const useFilteredDocuments = (
  documents: RackDocumentDto[] | undefined,
  filter: DocumentFilter,
) => {
  const [filteredDocuments, setFilteredDocuments] = useState<RackDocumentDto[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user: currentUser } = useUser();

  useEffect(() => {
    const filterDocuments = async (): Promise<void> => {
      // If no documents, set filtered documents to empty array
      if (!documents) {
        setFilteredDocuments([]);
        setIsLoading(true);
        return;
      }

      try {
        // Get current user
        if (!currentUser) {
          setFilteredDocuments([]);
          return;
        }

        // Filter documents based on filter type
        let filtered: RackDocumentDto[] = [];

        switch (filter) {
          case "inbox":
            // Inbox: Only documents where the recipient is the current user and the folder is not Trash
            filtered = documents.filter(
              (doc) => doc.to === currentUser.userId && doc.folder !== "Trash",
            );
            break;

          case "deposits":
            // Deposits: Only documents where the sender is the current user (regardless of folder)
            filtered = documents.filter(
              (doc) => doc.from === currentUser.userId,
            );
            break;

          case "trash":
            // Trash: Only documents where the recipient is the current user and the folder is Trash
            filtered = documents.filter(
              (doc) => doc.to === currentUser.userId && doc.folder === "Trash",
            );
            break;

          default:
            filtered = [];
        }

        setFilteredDocuments(filtered);
      } catch (error) {
        // Set filtered documents to empty array
        console.error("Error while filtering documents:", error);
        setFilteredDocuments([]);
      } finally {
        // Set loading to false
        setIsLoading(false);
      }
    };

    filterDocuments();
  }, [documents, filter, currentUser]);

  return { filteredDocuments, isLoading };
};
