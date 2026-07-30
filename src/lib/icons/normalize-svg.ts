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

    const attrs: Record<string, string> = { ...node.attributes, d };
    delete attrs.cx;
    delete attrs.cy;
    delete attrs.r;
    delete attrs.rx;
    delete attrs.ry;
    delete attrs.x1;
    delete attrs.y1;
    delete attrs.x2;
    delete attrs.y2;
    delete attrs.points;
    if (node.name !== "rect") {
      delete attrs.x;
      delete attrs.y;
      delete attrs.width;
      delete attrs.height;
    }

    paths.push({ tag: "path", attrs, length });
  }

  return { viewBox, paths };
}
