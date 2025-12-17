import { create } from "zustand";
import { createSelectors } from "./createSelectors";

type ModalType = "upload" | null;

interface RackState {
  openedModal: ModalType;
  setOpenedModal: (modal: ModalType) => void;
}

const useRackStoreBase = create<RackState>((set) => ({
  openedModal: null,
  setOpenedModal: (modal) => set({ openedModal: modal }),
}));

export const useRackStore = createSelectors(useRackStoreBase);
