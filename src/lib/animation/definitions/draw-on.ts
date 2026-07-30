import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";
import { getPrecomputedLength } from "../path-length";
import { applyEasing, easingParam, type EasingName } from "./shared";

export interface DrawOnParams extends Record<string, unknown> {
  easing: EasingName;
}

export const drawOn: AnimationDefinition<DrawOnParams> = {
  id: "draw-on",
  name: "Draw On",
  description: "Traces each stroke path from 0 to full length, like the icon being drawn by hand.",
  requiresStrokeBased: true,
  defaultDurationMs: 1200,
  paramsSchema: {
    easing: easingParam,
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const eased = applyEasing(progress, params.easing ?? "ease-out");
    return {
      elements: icon.paths.map((_, i) => {
        const length = getPrecomputedLength(icon, i);
        return {
          strokeDasharray: `${length}`,
          strokeDashoffset: length * (1 - eased),
        };
      }),
    };
  },
};
