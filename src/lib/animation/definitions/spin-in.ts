import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";
import { applyEasing, easingParam, type EasingName } from "./shared";

interface SpinInParams extends Record<string, unknown> {
  easing: EasingName;
  degrees: number;
}

export const spinIn: AnimationDefinition<SpinInParams> = {
  id: "spin-in",
  name: "Spin In",
  description: "Rotates the whole icon into place with a controlled fade.",
  defaultDurationMs: 900,
  paramsSchema: {
    easing: easingParam,
    degrees: {
      type: "number",
      label: "Rotation",
      default: 90,
      min: 15,
      max: 360,
      step: 15,
    },
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const eased = applyEasing(progress, params.easing);
    const degrees = Number(params.degrees ?? 90);
    return {
      container: {
        opacity: eased,
        transform: `rotate(${(1 - eased) * -degrees}deg) scale(${0.88 + eased * 0.12})`,
      },
      elements: icon.paths.map(() => ({})),
    };
  },
};
