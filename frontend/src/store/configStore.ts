import { create } from "zustand";
import { createSelectors } from "./createSelectors";
import type { Config, Actions } from "~/config";

interface ConfigState {
  config: Config | null;
  actions: Actions | null;
  setConfig: (config: Config) => void;
  setActions: (actions: Actions) => void;
}

const useConfigStoreBase = create<ConfigState>((set) => ({
  config: null,
  actions: null,
  setConfig: (config) => set({ config }),
  setActions: (actions) => set({ actions }),
}));

export const useConfigStore = createSelectors(useConfigStoreBase);
