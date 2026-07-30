export type IconLibrary =
  | "lucide"
  | "tabler"
  | "phosphor"
  | "heroicons"
  | "iconoir"
  | "remixicon"
  | "custom";

/** One drawable SVG element (path/circle/rect/...), normalized so every
 * shape has an equivalent `d` attribute and a precomputed stroke length. */
export interface IconPathData {
  tag: string;
  attrs: Record<string, string>;
  /** Precomputed via svg-path-properties at index time. Only meaningful for stroke-based icons. */
  length: number;
}

export interface IconMeta {
  id: string;
  name: string;
  library: IconLibrary;
  tags: string[];
  viewBox: string;
  isStrokeBased: boolean;
  svgRaw: string;
  paths: IconPathData[];
}

/** Lightweight entry used for the search index / preview index. */
export interface IconSearchEntry {
  id: string;
  name: string;
  library: IconLibrary;
  tags: string[];
  isStrokeBased: boolean;
}
