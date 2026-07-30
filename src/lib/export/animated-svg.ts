import type { IconMeta, IconPathData } from "../../../types/icon";
import { getAnimation } from "@/lib/animation/registry";
import { getPrecomputedLength } from "@/lib/animation/path-length";
import type { ProgressStyle } from "@/lib/animation/types";

export type ExportFormat = "svg" | "html" | "react" | "gif" | "mp4" | "webm";
export type ExportStrokeDirection = "forward" | "backward" | "center-out";

export interface ExportSequence {
  id: string;
  name: string;
  pathIndexes: number[];
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
  delayMs: number;
  direction: ExportStrokeDirection;
  reverse: boolean;
}

export interface ExportPayload {
  icon: IconMeta;
  color: string;
  sequences: ExportSequence[];
}

export interface RasterExportOptions {
  size: number;
  fps: number;
  backgroundColor: string;
  transparent: boolean;
}

const HOLD_MS = 500;

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fileSafeName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "blick-icon"
  );
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

function reactPathPresentation(icon: IconMeta, path: IconPathData) {
  if (!icon.isStrokeBased) return `fill="currentColor" stroke="none"`;

  const strokeWidth = path.attrs["stroke-width"] ?? "2";
  const strokeLinecap = path.attrs["stroke-linecap"] ?? "round";
  const strokeLinejoin = path.attrs["stroke-linejoin"] ?? "round";

  return [
    `fill="none"`,
    `stroke="currentColor"`,
    `strokeWidth="${escapeAttribute(strokeWidth)}"`,
    `strokeLinecap="${escapeAttribute(strokeLinecap)}"`,
    `strokeLinejoin="${escapeAttribute(strokeLinejoin)}"`,
  ].join(" ");
}

function sequenceEnd(sequence: ExportSequence) {
  return sequence.delayMs + sequence.durationMs;
}

export function timelineDuration(sequences: ExportSequence[]) {
  return sequences.reduce((total, sequence) => total + sequenceEnd(sequence), 0);
}

function getSequenceOffsets(sequences: ExportSequence[]) {
  return sequences.reduce<Array<{ start: number; end: number }>>((offsets, sequence) => {
    const previousEnd = offsets.at(-1)?.end ?? 0;
    const start = previousEnd + sequence.delayMs;
    const end = start + sequence.durationMs;
    return [...offsets, { start, end }];
  }, []);
}

function drawStrokeStyle({
  icon,
  pathIndex,
  progress,
  direction,
}: {
  icon: IconMeta;
  pathIndex: number;
  progress: number;
  direction: ExportStrokeDirection;
}): ProgressStyle["elements"][number] {
  const length = getPrecomputedLength(icon, pathIndex);
  if (direction === "center-out") {
    const drawn = length * progress;
    return {
      opacity: progress,
      strokeDasharray: `${drawn} ${Math.max(0, length - drawn)}`,
      strokeDashoffset: length * (1 - progress) * 0.5,
    };
  }

  const offset = length * (1 - progress);
  return {
    opacity: progress,
    strokeDasharray: `${length}`,
    strokeDashoffset: direction === "backward" ? -offset : offset,
  };
}

function styleAtTime(payload: ExportPayload, timeMs: number) {
  const { icon, sequences } = payload;
  const offsets = getSequenceOffsets(sequences);
  const assignedPaths = new Set(sequences.flatMap((sequence) => sequence.pathIndexes));
  const styles = icon.paths.map<ProgressStyle["elements"][number]>((_, index) => ({
    opacity: assignedPaths.has(index) ? 0 : 0.18,
  }));

  sequences.forEach((sequence, sequenceIndex) => {
    const offset = offsets[sequenceIndex];
    const definition = getAnimation(sequence.animationId);
    if (!definition || !offset) return;

    let local = 0;
    if (timeMs >= offset.end) local = 1;
    else if (timeMs >= offset.start) local = Math.min(1, Math.max(0, (timeMs - offset.start) / sequence.durationMs));

    const progress = sequence.reverse ? 1 - local : local;
    const computed =
      definition.id === "draw-on" ? null : definition.computeStyle(progress, sequence.params, icon);

    sequence.pathIndexes.forEach((pathIndex) => {
      const nextStyle =
        definition.id === "draw-on"
          ? drawStrokeStyle({ icon, pathIndex, progress, direction: sequence.direction })
          : (computed?.elements[pathIndex] ?? { opacity: progress });
      styles[pathIndex] = nextStyle;
    });
  });

  return styles;
}

function cssDeclaration(style: ProgressStyle["elements"][number]) {
  return [
    `opacity:${style.opacity ?? 1}`,
    `stroke-dasharray:${style.strokeDasharray ?? "none"}`,
    `stroke-dashoffset:${style.strokeDashoffset ?? 0}`,
    `transform:${style.transform ?? "none"}`,
  ].join(";");
}

export function buildCssExport(payload: ExportPayload) {
  const durationMs = Math.max(1, timelineDuration(payload.sequences));
  const totalMs = durationMs + HOLD_MS;
  const frameCount = Math.max(12, Math.ceil((totalMs / 1000) * 12));

  const keyframes = payload.icon.paths
    .map((_, pathIndex) => {
      const frames = Array.from({ length: frameCount + 1 }, (_, frame) => {
        const percent = (frame / frameCount) * 100;
        const timeMs = Math.min(durationMs, (frame / frameCount) * totalMs);
        return `${percent.toFixed(2)}%{${cssDeclaration(styleAtTime(payload, timeMs)[pathIndex])}}`;
      }).join("");
      return `@keyframes blickPath${pathIndex}{${frames}}`;
    })
    .join("\n");

  const classes = payload.icon.paths
    .map(
      (_, pathIndex) =>
        `.blick-path-${pathIndex}{animation:blickPath${pathIndex} ${totalMs}ms linear infinite both}`,
    )
    .join("\n");

  return `.blick-svg{color:${payload.color};overflow:visible}
.blick-svg path{transform-box:fill-box;transform-origin:center}
${keyframes}
${classes}
@media (prefers-reduced-motion: reduce){.blick-svg path{animation:none!important}}`;
}

function buildSvgShell(payload: ExportPayload, includeStyle: boolean, staticTimeMs?: number) {
  const { icon } = payload;
  const staticStyles = staticTimeMs === undefined ? null : styleAtTime(payload, staticTimeMs);
  const paths = icon.paths
    .map((path, pathIndex) => {
      const inlineStyle = staticStyles?.[pathIndex]
        ? ` style="${escapeAttribute(cssDeclaration(staticStyles[pathIndex]))}"`
        : "";
      return `<path class="blick-path-${pathIndex}" d="${escapeAttribute(path.attrs.d)}" ${pathPresentation(
        icon,
        path,
      )}${inlineStyle}/>`;
    })
    .join("\n  ");

  return `<svg class="blick-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttribute(
    icon.viewBox,
  )}" role="img" aria-label="${escapeAttribute(icon.name)}" style="color:${escapeAttribute(
    payload.color,
  )};overflow:visible">
  <title>${escapeAttribute(icon.name)}</title>${includeStyle ? `\n  <style>\n${buildCssExport(payload)}\n  </style>` : ""}
  ${paths}
</svg>`;
}

export function buildAnimatedSvg(payload: ExportPayload) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${buildSvgShell(payload, true)}`;
}

export function buildHtmlExport(payload: ExportPayload) {
  const title = `${payload.icon.name} - Blick export`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeAttribute(title)}</title>
    <style>
      body{min-height:100vh;margin:0;display:grid;place-items:center;background:#0c0c0c}
      .icon-wrap{width:min(50vw,320px);aspect-ratio:1}
    ${buildCssExport(payload)}
    </style>
  </head>
  <body>
    <div class="icon-wrap">
      ${buildSvgShell(payload, false)}
    </div>
  </body>
</html>`;
}

export function buildReactExport(payload: ExportPayload) {
  const componentName = `${fileSafeName(payload.icon.name)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}Icon`;

  return `export default function ${componentName}({
  color = "${payload.color}",
  size = 96,
  className = "",
}) {
  return (
    <svg
      className={\`blick-svg \${className}\`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${escapeAttribute(payload.icon.viewBox)}"
      role="img"
      aria-label="${escapeAttribute(payload.icon.name)}"
      style={{ color, width: size, height: size }}
    >
      <title>${payload.icon.name}</title>
      <style>{\`${buildCssExport(payload).replaceAll("`", "\\`").replaceAll("${", "\\${")}\`}</style>
      ${payload.icon.paths
        .map(
          (path, pathIndex) =>
            `<path className="blick-path-${pathIndex}" d="${escapeAttribute(path.attrs.d)}" ${reactPathPresentation(
              payload.icon,
              path,
            )} />`,
        )
        .join("\n      ")}
    </svg>
  );
}`;
}

export function downloadTextFile(content: string, fileName: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  downloadBlob(blob, fileName);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadAnimatedSvg(payload: ExportPayload) {
  downloadTextFile(buildAnimatedSvg(payload), `${fileSafeName(payload.icon.name)}-animated.svg`, "image/svg+xml;charset=utf-8");
}

export function downloadHtmlExport(payload: ExportPayload) {
  downloadTextFile(buildHtmlExport(payload), `${fileSafeName(payload.icon.name)}-animated.html`, "text/html;charset=utf-8");
}

export function downloadReactExport(payload: ExportPayload) {
  downloadTextFile(buildReactExport(payload), `${fileSafeName(payload.icon.name)}-animated.jsx`, "text/javascript;charset=utf-8");
}

async function svgToPngFrame(svg: string, options: RasterExportOptions) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "sync";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = options.size;
    canvas.height = options.size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering is not available.");
    ctx.clearRect(0, 0, options.size, options.size);
    if (!options.transparent) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, options.size, options.size);
    }
    ctx.drawImage(image, 0, 0, options.size, options.size);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not render frame."));
      }, "image/png");
    });
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadFfmpeg() {
  const [{ FFmpeg }] = await Promise.all([import("@ffmpeg/ffmpeg")]);
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: "/ffmpeg/ffmpeg-core.js",
    wasmURL: "/ffmpeg/ffmpeg-core.wasm",
  });
  return ffmpeg;
}

export async function exportRasterAnimation(
  payload: ExportPayload,
  format: "gif" | "mp4" | "webm",
  options: RasterExportOptions,
  onProgress?: (message: string) => void,
) {
  const durationMs = Math.max(1, timelineDuration(payload.sequences));
  const totalFrames = Math.max(2, Math.ceil((durationMs / 1000) * options.fps));
  const ffmpeg = await loadFfmpeg();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const timeMs = Math.min(durationMs, (frame / (totalFrames - 1)) * durationMs);
    const svg = buildSvgShell(payload, false, timeMs);
    const png = await svgToPngFrame(svg, {
      ...options,
      transparent: format === "mp4" ? false : options.transparent,
    });
    await ffmpeg.writeFile(`frame-${String(frame).padStart(4, "0")}.png`, png);
    onProgress?.(`Rendered ${frame + 1}/${totalFrames} frames`);
  }

  const output = `blick-output.${format}`;
  const common = ["-framerate", `${options.fps}`, "-i", "frame-%04d.png"];
  const args =
    format === "gif"
      ? [
          ...common,
          "-lavfi",
          "split[s0][s1];[s0]palettegen=reserve_transparent=1[p];[s1][p]paletteuse",
          output,
        ]
      : format === "mp4"
        ? [...common, "-pix_fmt", "yuv420p", "-movflags", "faststart", output]
        : [...common, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", output];

  onProgress?.(`Encoding ${format.toUpperCase()}`);
  await ffmpeg.exec(args);
  const data = await ffmpeg.readFile(output);
  const rawBytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const bytes = new Uint8Array(rawBytes.byteLength);
  bytes.set(rawBytes);
  const mime = format === "gif" ? "image/gif" : format === "mp4" ? "video/mp4" : "video/webm";
  downloadBlob(new Blob([bytes], { type: mime }), `${fileSafeName(payload.icon.name)}-animated.${format}`);
  ffmpeg.terminate();
}

export function singleSequencePayload({
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
}): ExportPayload {
  return {
    icon,
    color,
    sequences: [
      {
        id: "default",
        name: "Default",
        pathIndexes: icon.paths.map((_, index) => index),
        animationId,
        params,
        durationMs,
        delayMs: 0,
        direction: "forward",
        reverse: false,
      },
    ],
  };
}
