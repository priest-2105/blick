import { join } from "node:path";
import { listSvgFiles, readSvg, NODE_MODULES, type RawIcon } from "./shared";
import { tagsFromName } from "../tags";

export function readHeroicons(): RawIcon[] {
  // 24/outline is the stroke-based set; 24/solid is fill-only and skipped.
  const dir = join(NODE_MODULES, "heroicons", "24", "outline");

  return listSvgFiles(dir).map((file) => {
    const name = file.replace(/\.svg$/, "");
    return {
      name,
      library: "heroicons" as const,
      tags: tagsFromName(name),
      svgRaw: readSvg(dir, file),
      isStrokeBased: true,
    };
  });
}
