"use client";

import { useAnimationFrame } from "framer-motion";
import { useMemo, useRef } from "react";
import { getAnimation } from "@/lib/animation/registry";
import type { ProgressStyle } from "@/lib/animation/types";
import {
  applyElementStyle,
  clamp01,
  drawStrokeStyle,
  HOLD_MS,
  sequenceOffsets,
  timelineDuration,
} from "@/lib/workshop/sequences";
import type { ExportPayload } from "@/lib/export/animated-svg";

export default function ExportPreview({
  payload,
  backgroundColor,
  transparent,
}: {
  payload: ExportPayload;
  backgroundColor: string;
  transparent: boolean;
}) {
  const { icon, color, sequences } = payload;
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const offsets = useMemo(() => sequenceOffsets(sequences), [sequences]);
  const totalMs = Math.max(1, timelineDuration(sequences));

  useAnimationFrame((time) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) % (totalMs + HOLD_MS);
    const nodes = pathRefs.current;

    if (svgRef.current) {
      svgRef.current.style.opacity = "";
      svgRef.current.style.transform = "";
    }

    sequences.forEach((sequence, sequenceIndex) => {
      const offset = offsets[sequenceIndex];
      const definition = getAnimation(sequence.animationId);
      if (!offset || !definition) return;

      let local = 0;
      if (elapsed >= offset.end) local = 1;
      else if (elapsed >= offset.start) local = clamp01((elapsed - offset.start) / sequence.durationMs);
      const progress = sequence.reverse ? 1 - local : local;

      let computed: ProgressStyle | null = null;
      if (definition.id !== "draw-on") {
        computed = definition.computeStyle(progress, sequence.params, icon);
      }

      sequence.pathIndexes.forEach((pathIndex) => {
        const node = nodes[pathIndex];
        if (!node) return;

        if (definition.id === "draw-on") {
          applyElementStyle(
            node,
            drawStrokeStyle({ icon, pathIndex, progress, direction: sequence.direction }),
          );
          return;
        }

        applyElementStyle(node, computed?.elements[pathIndex] ?? { opacity: progress });
      });
    });
  });

  return (
    <div
      className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-sm border border-[var(--line)]"
      style={{
        backgroundColor: transparent ? undefined : backgroundColor,
        backgroundImage: transparent
          ? "linear-gradient(45deg, rgba(128,128,128,0.25) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,0.25) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.25) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.25) 75%)"
          : undefined,
        backgroundSize: transparent ? "16px 16px" : undefined,
        backgroundPosition: transparent ? "0 0, 0 8px, 8px -8px, -8px 0" : undefined,
      }}
    >
      <div className="h-2/3 w-2/3">
        <svg
          ref={svgRef}
          viewBox={icon.viewBox}
          className="h-full w-full"
          style={{ color, transformBox: "fill-box", transformOrigin: "center" }}
          fill={icon.isStrokeBased ? "none" : "currentColor"}
          stroke={icon.isStrokeBased ? "currentColor" : "none"}
        >
          {icon.paths.map((path, index) => (
            <path
              key={index}
              ref={(node) => {
                pathRefs.current[index] = node;
              }}
              d={path.attrs.d}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              strokeWidth={icon.isStrokeBased ? (path.attrs["stroke-width"] ?? "2") : undefined}
              strokeLinecap={
                icon.isStrokeBased
                  ? (path.attrs["stroke-linecap"] as "round" | "butt" | "square") ?? "round"
                  : undefined
              }
              strokeLinejoin={
                icon.isStrokeBased
                  ? (path.attrs["stroke-linejoin"] as "round" | "miter" | "bevel") ?? "round"
                  : undefined
              }
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
