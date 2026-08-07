"use client";

import { useMemo } from "react";
import type { IconSearchEntry } from "../../../types/icon";
import IconCard from "./IconCard";
import { LIBRARIES } from "./LibraryFilter";

export default function LibraryBrowseView({
  entries,
  onSelect,
}: {
  entries: IconSearchEntry[];
  onSelect: (entry: IconSearchEntry) => void;
}) {
  const groups = useMemo(() => {
    return LIBRARIES.filter((lib) => lib.id !== "all")
      .map((lib) => ({
        ...lib,
        items: entries.filter((entry) => entry.library === lib.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [entries]);

  return (
    <div className="h-full overflow-y-auto">
      {groups.map((group) => (
        <section key={group.id}>
          <div className="sticky top-0 z-10 flex items-baseline justify-between gap-sp-5 border-b border-[var(--line)] bg-[var(--panel)] px-sp-6 py-sp-4">
            <h2 className="text-subheading-sm font-bold text-[var(--foreground)]">{group.label}</h2>
            <span className="text-label-xs text-[var(--muted)]">
              {group.items.length.toLocaleString()}
            </span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))" }}>
            {group.items.map((entry) => (
              <div key={`${entry.library}:${entry.name}`} className="aspect-square">
                <IconCard entry={entry} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
