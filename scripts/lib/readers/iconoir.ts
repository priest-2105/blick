import { join } from "node:path";
import { listSvgFiles, readSvg, NODE_MODULES, type RawIcon } from "./shared";
import { tagsFromName } from "../tags";

export function readIconoir(): RawIcon[] {
  const dir = join(NODE_MODULES, "iconoir", "icons", "regular");

  return listSvgFiles(dir).map((file) => {
    const name = file.replace(/\.svg$/, "");
    return {
      name,
      library: "iconoir" as const,
      tags: tagsFromName(name),
      svgRaw: readSvg(dir, file),
      isStrokeBased: true,
    };
  });
}
