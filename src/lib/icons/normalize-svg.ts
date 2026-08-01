import { parseSync, type INode } from "svgson";
import { svgPathProperties } from "svg-path-properties";
import type { IconPathData } from "../../../types/icon";

const DRAWABLE_TAGS = new Set([
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
]);

const SAFE_PATH_ATTRS = new Set([
  "d",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
]);

const SAFE_LINECAPS = new Set(["butt", "round", "square"]);
const SAFE_LINEJOINS = new Set(["arcs", "bevel", "miter", "miter-clip", "round"]);

function num(v: string | undefined, fallback = 0): number {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

function pointsToD(pointsAttr: string, close: boolean): string {
  const pts = pointsAttr
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number));
  if (pts.length === 0) return "";
  const [first, ...rest] = pts;
  let d = `M${first[0]} ${first[1]}`;
  for (const [x, y] of rest) d += ` L${x} ${y}`;
  if (close) d += " Z";
  return d;
}

function shapeToD(tag: string, attrs: Record<string, string>): string | null {
  switch (tag) {
    case "path":
      return attrs.d ?? null;
    case "line":
      return `M${num(attrs.x1)} ${num(attrs.y1)} L${num(attrs.x2)} ${num(attrs.y2)}`;
    case "polyline":
      return attrs.points ? pointsToD(attrs.points, false) : null;
    case "polygon":
      return attrs.points ? pointsToD(attrs.points, true) : null;
    case "rect": {
      const x = num(attrs.x);
      const y = num(attrs.y);
      const w = num(attrs.width);
      const h = num(attrs.height);
      if (w <= 0 || h <= 0) return null;
      return `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
    }
    case "circle": {
      const cx = num(attrs.cx);
      const cy = num(attrs.cy);
      const r = num(attrs.r);
      if (r <= 0) return null;
      return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    }
    case "ellipse": {
      const cx = num(attrs.cx);
      const cy = num(attrs.cy);
      const rx = num(attrs.rx);
      const ry = num(attrs.ry);
      if (rx <= 0 || ry <= 0) return null;
      return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    default:
      return null;
  }
}

function isInvisible(attrs: Record<string, string>): boolean {
  return attrs.stroke === "none" && (attrs.fill === "none" || attrs.fill === undefined);
}

function isSafeNumberList(value: string): boolean {
  return /^[\d\s.,+\-eE]+$/.test(value);
}

function cleanPathAttrs(attrs: Record<string, string>, d: string): Record<string, string> {
  const cleaned: Record<string, string> = { d };

  for (const key of SAFE_PATH_ATTRS) {
    const value = attrs[key];
    if (!value) continue;
    if (key === "d") continue;
    if (key === "stroke-width" && !isSafeNumberList(value)) continue;
    if (key === "stroke-linecap" && !SAFE_LINECAPS.has(value)) continue;
    if (key === "stroke-linejoin" && !SAFE_LINEJOINS.has(value)) continue;
    cleaned[key] = value;
  }

  return cleaned;
}

function collectDrawable(node: INode, out: INode[]): void {
  for (const child of node.children ?? []) {
    if (DRAWABLE_TAGS.has(child.name)) out.push(child);
    if (child.name === "g" || child.children?.length) collectDrawable(child, out);
  }
}

export interface NormalizedSvg {
  viewBox: string;
  paths: IconPathData[];
}

export function hasVisibleStroke(svgRaw: string): boolean {
  const root = parseSync(svgRaw);
  const nodes: INode[] = [];
  collectDrawable(root, nodes);
  return nodes.some((node) => {
    const stroke = node.attributes.stroke;
    const width = node.attributes["stroke-width"];
    return stroke !== undefined && stroke !== "none" && width !== "0";
  });
}

export function normalizeSvg(svgRaw: string, computeLengths: boolean): NormalizedSvg {
  const root = parseSync(svgRaw);
  const viewBox = root.attributes.viewBox || "0 0 24 24";
  const drawableNodes: INode[] = [];
  collectDrawable(root, drawableNodes);

  const paths: IconPathData[] = [];
  for (const node of drawableNodes) {
    if (isInvisible(node.attributes)) continue;

    const d = shapeToD(node.name, node.attributes);
    if (!d) continue;

    let length = 0;
    if (computeLengths) {
      try {
        length = new svgPathProperties(d).getTotalLength();
      } catch {
        length = 0;
      }
    }

    paths.push({ tag: "path", attrs: cleanPathAttrs(node.attributes, d), length });
  }

  return { viewBox, paths };
}
