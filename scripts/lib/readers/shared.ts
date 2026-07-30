import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { IconLibrary } from "../../../types/icon";

export interface RawIcon {
  name: string;
  library: IconLibrary;
  tags: string[];
  svgRaw: string;
  isStrokeBased: boolean;
}

export function listSvgFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".svg"));
}

export function readSvg(dir: string, file: string): string {
  return readFileSync(join(dir, file), "utf-8");
}

export const NODE_MODULES = join(process.cwd(), "node_modules");
