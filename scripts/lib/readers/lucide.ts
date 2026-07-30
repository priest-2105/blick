import { join } from "node:path";
import { readFileSync } from "node:fs";
import { listSvgFiles, readSvg, NODE_MODULES, type RawIcon } from "./shared";
import { tagsFromName } from "../tags";

export function readLucide(): RawIcon[] {
  const dir = join(NODE_MODULES, "lucide-static", "icons");
  const tagsPath = join(NODE_MODULES, "lucide-static", "tags.json");
  const tagsJson: Record<string, string[]> = JSON.parse(readFileSync(tagsPath, "utf-8"));

  return listSvgFiles(dir).map((file) => {
    const name = file.replace(/\.svg$/, "");
    return {
      name,
      library: "lucide" as const,
      tags: tagsFromName(name, tagsJson[name] ?? []),
      svgRaw: readSvg(dir, file),
      isStrokeBased: true,
    };
  });
}
