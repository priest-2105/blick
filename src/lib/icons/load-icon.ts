import type { IconLibrary, IconMeta } from "../../../types/icon";

const cache = new Map<string, Promise<IconMeta>>();

/** Lazily fetches an icon's full data (svg/paths/lengths) only when opened
 * in the detail view, keeping the eager search index small. */
export function loadIcon(library: IconLibrary, name: string): Promise<IconMeta> {
  const key = `${library}:${name}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = fetch(`/icons-full/${library}/${name}.json`).then((res) => res.json());
    cache.set(key, entry);
  }
  return entry;
}
