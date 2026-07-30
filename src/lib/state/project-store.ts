import { create } from "zustand";
import type { IconMeta } from "../../../types/icon";

interface ProjectState {
  icon: IconMeta | null;
  color: string;
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
  setIcon: (icon: IconMeta | null) => void;
  setColor: (color: string) => void;
  setAnimationId: (id: string) => void;
  setParam: (key: string, value: unknown) => void;
  setDurationMs: (ms: number) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  icon: null,
  color: "#ffffff",
  animationId: "draw-on",
  params: { easing: "ease-out" },
  durationMs: 1200,
  setIcon: (icon) => set({ icon }),
  setColor: (color) => set({ color }),
  setAnimationId: (animationId) => set({ animationId }),
  setParam: (key, value) => set((s) => ({ params: { ...s.params, [key]: value } })),
  setDurationMs: (durationMs) => set({ durationMs }),
}));
