import { create } from "zustand";
import { createSelectors } from "./createSelectors";

interface DocumentActionState {
  openTrashModal: boolean;
  openDeleteModal: boolean;
  openRestoreModal: boolean;
  openCopyToWorkspaceModal: boolean;
  setOpenTrashModal: (open: boolean) => void;
  setOpenDeleteModal: (open: boolean) => void;
  setOpenRestoreModal: (open: boolean) => void;
  setOpenCopyToWorkspaceModal: (open: boolean) => void;
}

const useDocumentActionStoreBase = create<DocumentActionState>((set) => ({
  openTrashModal: false,
  openDeleteModal: false,
  openRestoreModal: false,
  openCopyToWorkspaceModal: false,
  setOpenTrashModal: (open: boolean) => set({ openTrashModal: open }),
  setOpenDeleteModal: (open: boolean) => set({ openDeleteModal: open }),
  setOpenRestoreModal: (open: boolean) => set({ openRestoreModal: open }),
  setOpenCopyToWorkspaceModal: (open: boolean) =>
    set({ openCopyToWorkspaceModal: open }),
}));

export const useDocumentActionStore = createSelectors(
  useDocumentActionStoreBase,
);
