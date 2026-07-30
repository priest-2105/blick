import { join } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { readSvg, NODE_MODULES, type RawIcon } from "./shared";
import { tagsFromName } from "../tags";

export function readRemixicon(): RawIcon[] {
  const iconsDir = join(NODE_MODULES, "remixicon", "icons");
  const categories = readdirSync(iconsDir).filter((entry) =>
    statSync(join(iconsDir, entry)).isDirectory(),
  );

  const icons: RawIcon[] = [];
  for (const category of categories) {
    const categoryDir = join(iconsDir, category);
    const files = readdirSync(categoryDir).filter((f) => f.endsWith("-line.svg"));
    for (const file of files) {
      const name = file.replace(/-line\.svg$/, "");
      icons.push({
        name,
        library: "remixicon" as const,
        tags: tagsFromName(name, [category]),
        svgRaw: readSvg(categoryDir, file),
        // Remix's "-line" icons are compound fill="currentColor" paths, not real strokes.
        isStrokeBased: false,
      });
    }
  }
  return icons;
}
