import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";
import { applyEasing, easingParam, type EasingName } from "./shared";

interface PopInParams extends Record<string, unknown> {
  easing: EasingName;
  scaleFrom: number;
}

export const popIn: AnimationDefinition<PopInParams> = {
  id: "pop-in",
  name: "Pop In",
  description: "Scales the whole icon up into place with a crisp opacity reveal.",
  defaultDurationMs: 800,
  paramsSchema: {
    easing: easingParam,
    scaleFrom: {
      type: "number",
      label: "Scale from",
      default: 0.72,
      min: 0.2,
      max: 1,
      step: 0.02,
    },
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const eased = applyEasing(progress, params.easing);
    const scaleFrom = Number(params.scaleFrom ?? 0.72);
    const scale = scaleFrom + (1 - scaleFrom) * eased;
    return {
      container: {
        opacity: eased,
        transform: `scale(${scale})`,
      },
      elements: icon.paths.map(() => ({})),
    };
  },
};
