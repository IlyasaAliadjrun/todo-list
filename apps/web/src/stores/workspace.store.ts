import { create } from "zustand";

interface WorkspaceState {
  selectedId: string | null;
  select: (id: string) => void;
}

/** Workspace yang sedang aktif di UI (switcher). */
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
}));
