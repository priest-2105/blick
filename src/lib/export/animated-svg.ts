import type { IconMeta, IconPathData } from "../../../types/icon";
import { getAnimation } from "@/lib/animation/registry";

const HOLD_MS = 500;
const KEYFRAME_STEPS = [0, 0.2, 0.4, 0.6, 0.8, 1];

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeCssString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function fileSafeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pathPresentation(icon: IconMeta, path: IconPathData) {
  if (!icon.isStrokeBased) return `fill="currentColor" stroke="none"`;

  const strokeWidth = path.attrs["stroke-width"] ?? "2";
  const strokeLinecap = path.attrs["stroke-linecap"] ?? "round";
  const strokeLinejoin = path.attrs["stroke-linejoin"] ?? "round";

  return [
    `fill="none"`,
    `stroke="currentColor"`,
    `stroke-width="${escapeAttribute(strokeWidth)}"`,
    `stroke-linecap="${escapeAttribute(strokeLinecap)}"`,
    `stroke-linejoin="${escapeAttribute(strokeLinejoin)}"`,
  ].join(" ");
}

export function buildAnimatedSvg({
  icon,
  animationId,
  params,
  durationMs,
  color,
}: {
  icon: IconMeta;
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
  color: string;
}) {
  const definition = getAnimation(animationId);
  const totalMs = durationMs + HOLD_MS;
  const animationName = definition?.name ?? "Animation";

  const keyframes = icon.paths
    .map((_, pathIndex) => {
      const frames = KEYFRAME_STEPS.map((step) => {
        const percent = Math.round(step * 100);
        const progress = step >= durationMs / totalMs ? 1 : Math.min(1, (step * totalMs) / durationMs);
        const style = definition?.computeStyle(progress, params, icon).elements[pathIndex];
        const declarations = [
          `opacity:${style?.opacity ?? 1}`,
          `stroke-dasharray:${style?.strokeDasharray ?? "none"}`,
          `stroke-dashoffset:${style?.strokeDashoffset ?? 0}`,
          `transform:${style?.transform ?? "none"}`,
        ];
        return `${percent}%{${declarations.join(";")}}`;
      }).join("");

      return `@keyframes blickPath${pathIndex}{${frames}}`;
    })
    .join("");

  const classes = icon.paths
    .map(
      (_, pathIndex) =>
        `.blick-path-${pathIndex}{animation:blickPath${pathIndex} ${totalMs}ms linear infinite both}`,
    )
    .join("");

  const paths = icon.paths
    .map(
      (path, pathIndex) =>
        `<path class="blick-path-${pathIndex}" d="${escapeAttribute(path.attrs.d)}" ${pathPresentation(
          icon,
          path,
        )}/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttribute(icon.viewBox)}" role="img" aria-label="${escapeAttribute(
    icon.name,
  )}" style="color:${escapeAttribute(color)};overflow:visible;transform-box:fill-box;transform-origin:center">
  <title>${escapeAttribute(icon.name)} - ${escapeAttribute(animationName)}</title>
  <style>
    path{transform-box:fill-box;transform-origin:center}
    ${keyframes}
    ${classes}
    @media (prefers-reduced-motion: reduce){path{animation:none!important}}
  </style>
  ${paths}
</svg>`;
}

export function downloadAnimatedSvg({
  icon,
  animationId,
  params,
  durationMs,
  color,
}: {
  icon: IconMeta;
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
  color: string;
}) {
  const svg = buildAnimatedSvg({ icon, animationId, params, durationMs, color });
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(icon.name) || "blick-icon"}-animated.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
