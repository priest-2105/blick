import type { IconMeta } from "../../../types/icon";

/** Stroke length was precomputed at index time (svg-path-properties), so
 * live preview / CSS export / future Remotion export all read the same
 * baked-in number instead of recomputing (and possibly disagreeing). */
export function getPrecomputedLength(icon: IconMeta, pathIndex: number): number {
  return icon.paths[pathIndex]?.length ?? 0;
}
