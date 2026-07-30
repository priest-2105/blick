import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { IconMeta, IconSearchEntry } from "../types/icon";
import { normalizeSvg } from "./lib/normalize-svg";
import type { RawIcon } from "./lib/readers/shared";
import { readLucide } from "./lib/readers/lucide";
import { readTabler } from "./lib/readers/tabler";
import { readPhosphor } from "./lib/readers/phosphor";
import { readHeroicons } from "./lib/readers/heroicons";
import { readIconoir } from "./lib/readers/iconoir";
import { readRemixicon } from "./lib/readers/remixicon";

const PUBLIC_DIR = join(process.cwd(), "public");
const FULL_DIR = join(PUBLIC_DIR, "icons-full");
const SEARCH_INDEX_PATH = join(PUBLIC_DIR, "icons-search-index.json");
const PREVIEW_INDEX_PATH = join(PUBLIC_DIR, "icons-preview-index.json");
const PREVIEW_PER_LIBRARY = 18;

function toIconMeta(raw: RawIcon): IconMeta {
  const { viewBox, paths } = normalizeSvg(raw.svgRaw, raw.isStrokeBased);
  return {
    id: `${raw.library}:${raw.name}`,
    name: raw.name,
    library: raw.library,
    tags: raw.tags,
    viewBox,
    isStrokeBased: raw.isStrokeBased,
    svgRaw: raw.svgRaw,
    paths,
  };
}

function main() {
  console.log("Reading icon libraries from node_modules...");
  const readers: Array<{ label: string; read: () => RawIcon[] }> = [
    { label: "lucide", read: readLucide },
    { label: "tabler", read: readTabler },
    { label: "phosphor", read: readPhosphor },
    { label: "heroicons", read: readHeroicons },
    { label: "iconoir", read: readIconoir },
    { label: "remixicon", read: readRemixicon },
  ];

  const seenIds = new Set<string>();
  const searchIndex: IconSearchEntry[] = [];
  const previewIndex: IconSearchEntry[] = [];
  let totalWritten = 0;
  let totalSkippedDupes = 0;

  if (existsSync(FULL_DIR)) rmSync(FULL_DIR, { recursive: true, force: true });
  mkdirSync(FULL_DIR, { recursive: true });

  for (const { label, read } of readers) {
    const raws = read();
    let written = 0;
    const libDir = join(FULL_DIR, label);
    mkdirSync(libDir, { recursive: true });

    for (const raw of raws) {
      const meta = toIconMeta(raw);
      if (seenIds.has(meta.id)) {
        totalSkippedDupes++;
        continue;
      }
      seenIds.add(meta.id);

      writeFileSync(join(libDir, `${raw.name}.json`), JSON.stringify(meta));
      const searchEntry: IconSearchEntry = {
        id: meta.id,
        name: meta.name,
        library: meta.library,
        tags: meta.tags,
        isStrokeBased: meta.isStrokeBased,
      };
      searchIndex.push(searchEntry);
      if (written < PREVIEW_PER_LIBRARY) previewIndex.push(searchEntry);
      written++;
    }

    console.log(`  ${label}: ${written} icons`);
    totalWritten += written;
  }

  writeFileSync(SEARCH_INDEX_PATH, JSON.stringify(searchIndex));
  writeFileSync(PREVIEW_INDEX_PATH, JSON.stringify(previewIndex));

  console.log(`\nTotal: ${totalWritten} icons indexed (${totalSkippedDupes} duplicate ids skipped).`);
  console.log(`Search index: ${SEARCH_INDEX_PATH}`);
  console.log(`Preview index: ${PREVIEW_INDEX_PATH} (${previewIndex.length} icons)`);
  console.log(`Full icon data: ${FULL_DIR}/<library>/<name>.json`);
}

main();
