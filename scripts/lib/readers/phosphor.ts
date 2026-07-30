import { join } from "node:path";
import { listSvgFiles, readSvg, NODE_MODULES, type RawIcon } from "./shared";
import { tagsFromName } from "../tags";

export function readPhosphor(): RawIcon[] {
  // "regular" weight, filename has no weight suffix (unlike thin/light/bold/duotone/fill).
  const dir = join(NODE_MODULES, "@phosphor-icons", "core", "assets", "regular");

  return listSvgFiles(dir).map((file) => {
    const name = file.replace(/\.svg$/, "");
    return {
      name,
      library: "phosphor" as const,
      tags: tagsFromName(name),
      svgRaw: readSvg(dir, file),
      // Phosphor's icons are solid fill="currentColor" paths, even in the "regular" weight.
      isStrokeBased: false,
    };
  });
}
