import { create } from "zustand";
import type { IconMeta } from "../../../types/icon";

interface WorkshopDraft {
  projectId?: string | null;
  localDraftId?: string | null;
  name?: string;
  icon: IconMeta;
  color: string;
  sequences: unknown[];
  activeSequenceId?: string | null;
}

interface ProjectState {
  icon: IconMeta | null;
  color: string;
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
  workshopDraft: WorkshopDraft | null;
  setIcon: (icon: IconMeta | null) => void;
  setColor: (color: string) => void;
  setAnimationId: (id: string) => void;
  setParam: (key: string, value: unknown) => void;
  setDurationMs: (ms: number) => void;
  loadWorkshopDraft: (draft: WorkshopDraft) => void;
  clearWorkshopDraft: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  icon: null,
  color: "#ffffff",
  animationId: "draw-on",
  params: { easing: "ease-out" },
  durationMs: 1200,
  workshopDraft: null,
  setIcon: (icon) => set({ icon }),
  setColor: (color) => set({ color }),
  setAnimationId: (animationId) => set({ animationId }),
  setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
  setDurationMs: (durationMs) => set({ durationMs }),
  loadWorkshopDraft: (draft) =>
    set({
      icon: draft.icon,
      color: draft.color,
      workshopDraft: draft,
    }),
  clearWorkshopDraft: () => set({ workshopDraft: null }),
}));
