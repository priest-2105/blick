"use client";

import { useEffect, useState } from "react";
import type { IconMeta, IconSearchEntry } from "../../../types/icon";
import { loadIcon } from "@/lib/icons/load-icon";

export default function IconCard({
  entry,
  onSelect,
}: {
  entry: IconSearchEntry;
  onSelect: (entry: IconSearchEntry) => void;
}) {
  const [icon, setIcon] = useState<IconMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIcon(entry.library, entry.name).then((icon) => {
      if (!cancelled) setIcon(icon);
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
      <span className="flex h-11 w-11 items-center justify-center">
        {icon && (
          <svg
            viewBox={icon.viewBox}
            className="h-10 w-10"
            fill={icon.isStrokeBased ? "none" : "currentColor"}
            stroke={icon.isStrokeBased ? "currentColor" : "none"}
            aria-hidden="true"
          >
            {icon.paths.map((path, index) => (
              <path
                key={index}
                d={path.attrs.d}
                strokeWidth={icon.isStrokeBased ? (path.attrs["stroke-width"] ?? "2") : undefined}
                strokeLinecap={
                  icon.isStrokeBased
                    ? (path.attrs["stroke-linecap"] as "round" | "butt" | "square") ?? "round"
                    : undefined
                }
                strokeLinejoin={
                  icon.isStrokeBased
                    ? (path.attrs["stroke-linejoin"] as "round" | "miter" | "bevel") ?? "round"
                    : undefined
                }
              />
            ))}
          </svg>
        )}
      </span>
      <span className="w-full truncate text-center text-xs font-normal text-[var(--subtle)] group-hover:text-[var(--active-ink)]">
        {entry.name}
      </span>
    </button>
  );
}
