import { join } from "node:path";
import { listSvgFiles, readSvg, NODE_MODULES, type RawIcon } from "./shared";
import { tagsFromName } from "../tags";

export function readTabler(): RawIcon[] {
  // "outline" is Tabler's stroke-based set (ideal for draw-on); "filled" is skipped.
  const dir = join(NODE_MODULES, "@tabler", "icons", "icons", "outline");

  return listSvgFiles(dir).map((file) => {
    const name = file.replace(/\.svg$/, "");
    return {
      name,
      library: "tabler" as const,
      tags: tagsFromName(name),
      svgRaw: readSvg(dir, file),
      isStrokeBased: true,
    };
  });
}
