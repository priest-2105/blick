import type { IconMeta } from "../../../types/icon";

/** Per-element style/attr overrides, indexed to match IconMeta.paths order. */
export interface ProgressStyle {
  elements: Array<{
    opacity?: number;
    strokeDasharray?: string;
    strokeDashoffset?: number;
    transform?: string;
  }>;
  container?: { opacity?: number; transform?: string };
}

export type ParamSchema = Record<
  string,
  {
    type: "number" | "color" | "select" | "boolean";
    label: string;
    default: number | string | boolean;
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
  }
>;

export interface AnimationDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  paramsSchema: ParamSchema;
  defaultDurationMs: number;
  /** true if this animation only makes visual sense on stroke-based icons (e.g. draw-on). */
  requiresStrokeBased?: boolean;
  /**
   * THE core pure function. Given the same progress/params/icon it must
   * always return the same ProgressStyle — no refs, no timers, no randomness.
   * This is what lets live preview, CSS export, and (later) Remotion export
   * all share one animation definition.
   */
  computeStyle(progress: number, params: P, icon: IconMeta): ProgressStyle;
}
