"use client";

import { useEffect, useState } from "react";
import type { IconSearchEntry } from "../../../types/icon";
import { loadIcon } from "@/lib/icons/load-icon";

export default function IconCard({
  entry,
  onSelect,
}: {
  entry: IconSearchEntry;
  onSelect: (entry: IconSearchEntry) => void;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIcon(entry.library, entry.name).then((icon) => {
      if (!cancelled) setSvg(icon.svgRaw);
    });
    return () => {
      cancelled = true;
    };
  }, [entry.library, entry.name]);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      title={`${entry.name} (${entry.library})`}
      className="group flex h-full w-full flex-col items-center justify-center gap-3 border-b border-r border-[var(--line)] bg-[var(--background)] p-3 text-[var(--foreground)] transition-colors hover:bg-[var(--active)] hover:text-[var(--active-ink)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center [&_svg]:h-10 [&_svg]:w-10"
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <span className="w-full truncate text-center text-xs font-normal text-[var(--subtle)] group-hover:text-[var(--active-ink)]">
        {entry.name}
      </span>
    </button>
  );
}
