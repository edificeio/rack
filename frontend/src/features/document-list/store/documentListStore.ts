import { create } from "zustand";
import { createSelectors } from "../../../store/createSelectors";
import type { RackDocumentDto } from "@edifice.io/rack-client-rest";
import type { DocumentFilter } from "../hooks/useFilteredDocuments";

export type DocumentSortField = "name" | "person" | "date";
export type SortDirection = "asc" | "desc";

export interface DocumentListSort {
  field: DocumentSortField;
  direction: SortDirection;
}

interface DocumentListState {
  selectedDocuments: Set<string>;
  page: number;
  filter: DocumentFilter;
  sort: DocumentListSort;
  toggleDocument: (id: string) => void;
  toggleAll: (allDocs: RackDocumentDto[]) => void;
  clearSelection: () => void;
  setPage: (page: number) => void;
  setFilter: (filter: DocumentFilter) => void;
  isAllSelected: (allDocs: RackDocumentDto[]) => boolean;
  handleSort: (sortField: DocumentSortField) => void;
  getSortIcon: (field: DocumentSortField) => string;
  isSortActive: (field: DocumentSortField) => boolean;
}

const useDocumentListStoreBase = create<DocumentListState>((set, get) => ({
  selectedDocuments: new Set(),
  page: 1,
  filter: "inbox",
  sort: {
    field: "date",
    direction: "desc",
  },
  toggleDocument: (id: string) =>
    set((state) => {
      const next = new Set(state.selectedDocuments);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedDocuments: next };
    }),
  toggleAll: (allDocs: RackDocumentDto[]) =>
    set((_) => {
      if (get().isAllSelected(allDocs)) {
        return { selectedDocuments: new Set() };
      }
      const allIds = allDocs.map((doc) => doc._id || doc.file);
      return { selectedDocuments: new Set(allIds) };
    }),
  clearSelection: () => set({ selectedDocuments: new Set() }),
  setPage: (page: number) => set({ page }),
  setFilter: (filter: DocumentFilter) =>
    set({ filter, selectedDocuments: new Set(), page: 1 }),
  isAllSelected: (allDocs: RackDocumentDto[]) => {
    if (!allDocs || allDocs.length === 0) return false;
    const { selectedDocuments } = get();
    return allDocs.every((doc) => selectedDocuments.has(doc._id || doc.file));
  },
  handleSort: (sortField: DocumentSortField) =>
    set((state) => {
      let sortDirection: SortDirection = "asc";
      if (state.sort.field === sortField && state.sort.direction === "asc") {
        sortDirection = "desc";
      }
      return {
        sort: { field: sortField, direction: sortDirection },
      };
    }),
  getSortIcon: (field: DocumentSortField) => {
    const { sort } = get();
    if (sort.field !== field) {
      return "sort";
    }
    return sort.direction === "asc" ? "sort-up" : "sort-down";
  },
  isSortActive: (field: DocumentSortField) => {
    return get().sort.field === field;
  },
}));

export const useDocumentListStore = createSelectors(useDocumentListStoreBase);
