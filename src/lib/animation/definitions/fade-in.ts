import type { IconMeta } from "../../../../types/icon";
import type { AnimationDefinition, ProgressStyle } from "../types";
import { applyEasing, easingParam, type EasingName } from "./shared";

interface FadeInParams extends Record<string, unknown> {
  easing: EasingName;
}

export const fadeIn: AnimationDefinition<FadeInParams> = {
  id: "fade-in",
  name: "Fade In",
  description: "Fades the icon in cleanly without changing its shape or position.",
  defaultDurationMs: 700,
  paramsSchema: {
    easing: easingParam,
  },
  computeStyle(progress, params, icon: IconMeta): ProgressStyle {
    const opacity = applyEasing(progress, params.easing);
    return {
      elements: icon.paths.map(() => ({ opacity })),
    };
  },
};
