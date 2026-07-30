import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";
import { applyEasing, easingParam, type EasingName } from "./shared";

interface RiseInParams extends Record<string, unknown> {
  easing: EasingName;
  distance: number;
}

export const riseIn: AnimationDefinition<RiseInParams> = {
  id: "rise-in",
  name: "Rise In",
  description: "Moves the icon upward into place while fading it in.",
  defaultDurationMs: 850,
  paramsSchema: {
    easing: easingParam,
    distance: {
      type: "number",
      label: "Distance",
      default: 12,
      min: 2,
      max: 36,
      step: 1,
    },
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const eased = applyEasing(progress, params.easing);
    const distance = Number(params.distance ?? 12);
    return {
      container: {
        opacity: eased,
        transform: `translateY(${(1 - eased) * distance}px)`,
      },
      elements: icon.paths.map(() => ({})),
    };
  },
};
