import type { AnimationDefinition } from "./types";
import { drawOn } from "./definitions/draw-on";
import { fadeIn } from "./definitions/fade-in";
import { popIn } from "./definitions/pop-in";
import { pulse } from "./definitions/pulse";
import { riseIn } from "./definitions/rise-in";
import { spinIn } from "./definitions/spin-in";
import { staggerReveal } from "./definitions/stagger-reveal";

export const animationRegistry: AnimationDefinition[] = [
  drawOn,
  fadeIn,
  popIn,
  riseIn,
  spinIn,
  pulse,
  staggerReveal,
];

export function getAnimation(id: string): AnimationDefinition | undefined {
  return animationRegistry.find((a) => a.id === id);
}

export function getAvailableAnimations(isStrokeBased: boolean): AnimationDefinition[] {
  return animationRegistry.filter((a) => !a.requiresStrokeBased || isStrokeBased);
}
