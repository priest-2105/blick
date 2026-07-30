/** Derives baseline search tags from a kebab-case icon filename, e.g.
 * "arrow-up-right" -> ["arrow-up-right", "arrow", "up", "right"]. */
export function tagsFromName(name: string, extra: string[] = []): string[] {
  const words = name.split("-").filter(Boolean);
  const tags = new Set<string>([name, ...words, ...extra.map((t) => t.toLowerCase())]);
  return Array.from(tags);
}
