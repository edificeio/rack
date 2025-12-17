import { create } from "zustand";
import { createSelectors } from "../../../store/createSelectors";

interface MenuState {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const useMenuStoreBase = create<MenuState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
}));

export const useMenuStore = createSelectors(useMenuStoreBase);
