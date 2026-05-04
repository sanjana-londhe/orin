import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SortMode = "due_date" | "emotional" | "manual";

interface UIState {
  sortMode: SortMode;
  openTooltipId: string | null;
  nudgedTaskIds: Set<string>;
  dismissedUntil: Record<string, number>;
  // which task card is currently in edit mode (null = none)
  editingTaskId: string | null;

  setSortMode: (mode: SortMode) => void;
  setOpenTooltipId: (id: string | null) => void;
  addNudge: (taskId: string) => void;
  removeNudge: (taskId: string) => void;
  dismissNudge: (taskId: string) => void;
  isSuppressed: (taskId: string) => boolean;
  setEditingTaskId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sortMode: "due_date",
      openTooltipId: null,
      nudgedTaskIds: new Set<string>(),
      dismissedUntil: {},
      editingTaskId: null,

      setSortMode: (mode) => set({ sortMode: mode }),
      setOpenTooltipId: (id) => set({ openTooltipId: id }),
      setEditingTaskId: (id) => set({ editingTaskId: id }),

      addNudge: (taskId) =>
        set((s) => ({ nudgedTaskIds: new Set([...s.nudgedTaskIds, taskId]) })),

      removeNudge: (taskId) =>
        set((s) => {
          const next = new Set(s.nudgedTaskIds);
          next.delete(taskId);
          return { nudgedTaskIds: next };
        }),

      dismissNudge: (taskId) =>
        set((s) => {
          const next = new Set(s.nudgedTaskIds);
          next.delete(taskId);
          return {
            nudgedTaskIds: next,
            dismissedUntil: {
              ...s.dismissedUntil,
              [taskId]: Date.now() + 2 * 60 * 60 * 1000, // suppress 2h
            },
          };
        }),

      isSuppressed: (taskId) => {
        const until = get().dismissedUntil[taskId];
        return !!until && Date.now() < until;
      },
    }),
    {
      name: "orin-ui",
      partialize: (state) => ({
        sortMode: state.sortMode,
        dismissedUntil: state.dismissedUntil, // persist 2h suppression across reloads
      }),
    }
  )
);
