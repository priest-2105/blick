import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";
import { applyEasing, easingParam, staggeredProgress, type EasingName } from "./shared";

interface StaggerRevealParams extends Record<string, unknown> {
  easing: EasingName;
  distance: number;
}

export const staggerReveal: AnimationDefinition<StaggerRevealParams> = {
  id: "stagger-reveal",
  name: "Stagger Reveal",
  description: "Reveals each path in sequence for a more constructed feel.",
  defaultDurationMs: 1200,
  paramsSchema: {
    easing: easingParam,
    distance: {
      type: "number",
      label: "Distance",
      default: 8,
      min: 0,
      max: 24,
      step: 1,
    },
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const distance = Number(params.distance ?? 8);
    return {
      elements: icon.paths.map((_, index) => {
        const local = applyEasing(
          staggeredProgress(index, icon.paths.length, progress),
          params.easing,
        );
        return {
          opacity: local,
          transform: `translateY(${(1 - local) * distance}px)`,
        };
      }),
    };
  },
};
