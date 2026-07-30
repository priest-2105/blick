import type { IconSearchEntry } from "../../../types/icon";

let previewCached: Promise<IconSearchEntry[]> | null = null;
let fullCached: Promise<IconSearchEntry[]> | null = null;

/** Small curated set (~18 per library) shown on first load, before the user
 * has typed anything or touched a filter — avoids fetching the full index
 * (~1.4MB) until it's actually needed. */
export function loadPreviewIndex(): Promise<IconSearchEntry[]> {
  if (!previewCached) {
    previewCached = fetch("/icons-preview-index.json").then((res) => res.json());
  }
  return previewCached;
}

/** Full search index, fetched once on demand (first keystroke or filter
 * change) and cached for the rest of the session. */
export function loadSearchIndex(): Promise<IconSearchEntry[]> {
  if (!fullCached) {
    fullCached = fetch("/icons-search-index.json").then((res) => res.json());
  }
  return fullCached;
}
