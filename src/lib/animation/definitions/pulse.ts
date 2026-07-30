import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";

interface PulseParams extends Record<string, unknown> {
  intensity: number;
}

export const pulse: AnimationDefinition<PulseParams> = {
  id: "pulse",
  name: "Pulse",
  description: "Adds a subtle breathing scale pulse for attention states.",
  defaultDurationMs: 1100,
  paramsSchema: {
    intensity: {
      type: "number",
      label: "Intensity",
      default: 0.1,
      min: 0.02,
      max: 0.3,
      step: 0.01,
    },
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const intensity = Number(params.intensity ?? 0.1);
    const wave = Math.sin(progress * Math.PI);
    return {
      container: {
        opacity: 1,
        transform: `scale(${1 + wave * intensity})`,
      },
      elements: icon.paths.map(() => ({})),
    };
  },
};
