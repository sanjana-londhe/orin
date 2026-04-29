import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SortMode = "due_date" | "emotional" | "manual";

interface UIState {
  sortMode: SortMode;
  openTooltipId: string | null;
  setSortMode: (mode: SortMode) => void;
  setOpenTooltipId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sortMode: "due_date",
      openTooltipId: null,
      setSortMode: (mode) => set({ sortMode: mode }),
      setOpenTooltipId: (id) => set({ openTooltipId: id }),
    }),
    {
      name: "orin-ui",
      // Only persist sortMode — openTooltipId resets on every load
      partialize: (state) => ({ sortMode: state.sortMode }),
    }
  )
);
