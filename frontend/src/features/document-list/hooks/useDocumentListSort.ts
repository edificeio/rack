import { useCallback, useMemo } from "react";
import { useDocumentListStore } from "../store/documentListStore";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";
import type { DocumentSortField } from "../store/documentListStore";

export const useDocumentListSort = (
  documents: RackDocumentDto[] | undefined,
  filter: "inbox" | "deposits" | "trash",
) => {
  const sort = useDocumentListStore.use.sort();
  const handleSort = useDocumentListStore.use.handleSort();

  const getSortIcon = useCallback(
    (field: DocumentSortField) => {
      if (sort.field !== field) {
        return "sort";
      }
      return sort.direction === "asc" ? "sort-up" : "sort-down";
    },
    [sort],
  );

  const isSortActive = useCallback(
    (field: DocumentSortField) => sort.field === field,
    [sort],
  );

  const sortedDocuments = useMemo(() => {
    if (!documents || documents.length === 0) {
      return documents || [];
    }

    const sorted = [...documents];

    sorted.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sort.field) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "person":
          aValue =
            (filter === "deposits" ? a.toName : a.fromName)?.toLowerCase() ||
            "";
          bValue =
            (filter === "deposits" ? b.toName : b.fromName)?.toLowerCase() ||
            "";
          break;
        case "date":
          aValue = new Date(a.sent).getTime();
          bValue = new Date(b.sent).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sort.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [documents, sort, filter]);

  return {
    sort,
    sortedDocuments,
    handleSort,
    getSortIcon,
    isSortActive,
  };
};
