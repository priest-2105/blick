"use client";

import { useAnimationFrame } from "framer-motion";
import { useRef } from "react";
import type { IconMeta } from "../../../types/icon";
import { getAnimation } from "@/lib/animation/registry";

const HOLD_MS = 500;

export default function LivePreview({
  icon,
  color,
  animationId,
  params,
  durationMs,
}: {
  icon: IconMeta;
  color: string;
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
}) {
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useAnimationFrame((time) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    const cycle = durationMs + HOLD_MS;
    const t = elapsed % cycle;
    const progress = Math.min(1, t / durationMs);

    const definition = getAnimation(animationId);
    if (!definition) return;
    const style = definition.computeStyle(progress, params, icon);
    if (svgRef.current) {
      svgRef.current.style.opacity =
        style.container?.opacity !== undefined ? `${style.container.opacity}` : "";
      svgRef.current.style.transform = style.container?.transform ?? "";
    }

    style.elements.forEach((el, i) => {
      const node = pathRefs.current[i];
      if (!node) return;
      if (el.strokeDasharray !== undefined) node.style.strokeDasharray = el.strokeDasharray;
      if (el.strokeDashoffset !== undefined)
        node.style.strokeDashoffset = `${el.strokeDashoffset}`;
      if (el.opacity !== undefined) node.style.opacity = `${el.opacity}`;
      if (el.transform !== undefined) node.style.transform = el.transform;
    });
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
      {icon.paths.map((p, i) => (
        <path
          key={i}
          ref={(node) => {
            pathRefs.current[i] = node;
          }}
          d={p.attrs.d}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          strokeWidth={icon.isStrokeBased ? (p.attrs["stroke-width"] ?? "2") : undefined}
          strokeLinecap={
            icon.isStrokeBased
              ? (p.attrs["stroke-linecap"] as "round" | "butt" | "square") ?? "round"
              : undefined
          }
          strokeLinejoin={
            icon.isStrokeBased
              ? (p.attrs["stroke-linejoin"] as "round" | "miter" | "bevel") ?? "round"
              : undefined
          }
        />
      ))}
    </svg>
  );
}
