"use client";

import { useAnimationFrame } from "framer-motion";
import { useMemo, useRef } from "react";
import type { IconMeta } from "../../../types/icon";
import { getAnimation } from "@/lib/animation/registry";
import type { ProgressStyle } from "@/lib/animation/types";
import {
  applyElementStyle,
  clamp01,
  drawStrokeStyle,
  HOLD_MS,
  sequenceOffsets,
  timelineDuration,
  type AnimationSequence,
  type PlaybackMode,
} from "@/lib/workshop/sequences";

export default function SequencePreview({
  icon,
  color,
  sequences,
  activeSequenceId,
  hoveredPathIndex,
  playheadMs,
  isPlaying,
  playbackMode,
  onPathToggle,
  onPathHover,
  onPlayheadChange,
}: {
  icon: IconMeta;
  color: string;
  sequences: AnimationSequence[];
  activeSequenceId: string | null;
  hoveredPathIndex: number | null;
  playheadMs: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  onPathToggle: (pathIndex: number) => void;
  onPathHover: (pathIndex: number | null) => void;
  onPlayheadChange: (timeMs: number) => void;
}) {
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastPublishedRef = useRef(0);
  const offsets = useMemo(() => sequenceOffsets(sequences), [sequences]);
  const totalMs = Math.max(1, timelineDuration(sequences));
  const activeSequence = sequences.find((sequence) => sequence.id === activeSequenceId) ?? null;
  const assignedPaths = useMemo(
    () => new Set(sequences.flatMap((sequence) => sequence.pathIndexes)),
    [sequences],
  );

  useAnimationFrame((time) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    if (!isPlaying) startTimeRef.current = time - playheadMs;
    const elapsedRaw = isPlaying ? time - startTimeRef.current : playheadMs;
    const elapsed =
      playbackMode === "loop" ? elapsedRaw % (totalMs + HOLD_MS) : Math.min(totalMs, elapsedRaw);
    const nodes = pathRefs.current;

    if (isPlaying && time - lastPublishedRef.current > 80) {
      lastPublishedRef.current = time;
      onPlayheadChange(Math.min(totalMs, elapsed));
    }

    if (svgRef.current) {
      svgRef.current.style.opacity = "";
      svgRef.current.style.transform = "";
    }

    icon.paths.forEach((_, index) => {
      const node = nodes[index];
      if (!node) return;
      node.style.opacity = assignedPaths.has(index) ? "0" : "0.18";
      node.style.strokeDasharray = "";
      node.style.strokeDashoffset = "";
      node.style.transform = "";
      node.style.filter = "";
    });

    sequences.forEach((sequence, sequenceIndex) => {
      const offset = offsets[sequenceIndex];
      const definition = getAnimation(sequence.animationId);
      if (!offset || !definition) return;

      let local = 0;
      if (elapsed >= offset.end) local = 1;
      else if (elapsed >= offset.start) local = clamp01((elapsed - offset.start) / sequence.durationMs);
      else local = 0;

      const progress = sequence.reverse ? 1 - local : local;
      const isActive = elapsed >= offset.start && elapsed < offset.end;
      const isSelected = activeSequenceId === sequence.id;
      const emphasisOpacity = isSelected || isActive ? 1 : 0.78;

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
            drawStrokeStyle({
              icon,
              pathIndex,
              progress,
              direction: sequence.direction,
            }),
          );
          node.style.opacity = `${Number(node.style.opacity || 1) * emphasisOpacity}`;
          return;
        }

        const style = computed?.elements[pathIndex] ?? { opacity: progress };
        applyElementStyle(node, {
          ...style,
          opacity: (style.opacity ?? 1) * emphasisOpacity,
        });
      });
    });

    activeSequence?.pathIndexes.forEach((pathIndex) => {
      const node = nodes[pathIndex];
      if (node) {
        const currentOpacity = Number(node.style.opacity || 0);
        node.style.opacity = `${Math.max(currentOpacity, 0.34)}`;
        node.style.filter = "";
      }
    });

    if (hoveredPathIndex !== null) {
      const node = nodes[hoveredPathIndex];
      if (node) {
        node.style.opacity = "1";
        node.style.filter = "";
      }
    }
  });

  return (
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
          onClick={() => onPathToggle(index)}
          onMouseEnter={() => onPathHover(index)}
          onMouseLeave={() => onPathHover(null)}
          style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "center" }}
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
  );
}
