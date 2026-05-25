import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SortMode = "due_date" | "emotional" | "manual";

// How loud completing a task feels. Escalates by significance:
//  - calm:        finishing a task is silent; clearing the day shows a quiet line
//  - standard:    a soft tick per task; a modest confetti + line when the day clears
//  - celebratory: brighter tick per task; a full burst + line when the day clears
export type CelebrationIntensity = "calm" | "standard" | "celebratory";

interface UIState {
  sortMode: SortMode;
  openTooltipId: string | null;
  nudgedTaskIds: Set<string>;
  dismissedUntil: Record<string, number>;
  // which task card is currently in edit mode (null = none)
  editingTaskId: string | null;
  // sidebar/FAB sets this; the Today page consumes it to auto-open the inline create form
  pendingCreateTask: boolean;
  // how much fanfare task completion produces
  celebrationIntensity: CelebrationIntensity;

  setSortMode: (mode: SortMode) => void;
  setCelebrationIntensity: (level: CelebrationIntensity) => void;
  setOpenTooltipId: (id: string | null) => void;
  addNudge: (taskId: string) => void;
  removeNudge: (taskId: string) => void;
  dismissNudge: (taskId: string) => void;
  isSuppressed: (taskId: string) => boolean;
  setEditingTaskId: (id: string | null) => void;
  requestCreateTask: () => void;
  consumeCreateTaskRequest: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sortMode: "due_date",
      openTooltipId: null,
      nudgedTaskIds: new Set<string>(),
      dismissedUntil: {},
      editingTaskId: null,
      pendingCreateTask: false,
      celebrationIntensity: "standard",

      setSortMode: (mode) => set({ sortMode: mode }),
      setCelebrationIntensity: (level) => set({ celebrationIntensity: level }),
      setOpenTooltipId: (id) => set({ openTooltipId: id }),
      setEditingTaskId: (id) => set({ editingTaskId: id }),
      requestCreateTask: () => set({ pendingCreateTask: true }),
      consumeCreateTaskRequest: () => set({ pendingCreateTask: false }),

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
        celebrationIntensity: state.celebrationIntensity,
        dismissedUntil: state.dismissedUntil, // persist 2h suppression across reloads
      }),
    }
  )
);
