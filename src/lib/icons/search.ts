import Fuse from "fuse.js";
import type { IconSearchEntry } from "../../../types/icon";

export function createIconSearcher(entries: IconSearchEntry[]) {
  const fuse = new Fuse(entries, {
    keys: [
      { name: "name", weight: 0.5 },
      { name: "tags", weight: 0.3 },
      { name: "library", weight: 0.2 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });

  return function search(query: string): IconSearchEntry[] {
    if (!query.trim()) return entries;
    return fuse.search(query).map((r) => r.item);
  };
}
