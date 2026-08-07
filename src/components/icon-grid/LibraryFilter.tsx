"use client";

import type { IconLibrary } from "../../../types/icon";

export const LIBRARIES: Array<{ id: IconLibrary | "all"; label: string }> = [
  { id: "all", label: "All libraries" },
  { id: "lucide", label: "Lucide" },
  { id: "tabler", label: "Tabler" },
  { id: "phosphor", label: "Phosphor" },
  { id: "heroicons", label: "Heroicons" },
  { id: "iconoir", label: "Iconoir" },
  { id: "remixicon", label: "Remix Icon" },
];

export default function LibraryFilter({
  value,
  onChange,
}: {
  value: IconLibrary | "all";
  onChange: (value: IconLibrary | "all") => void;
}) {
  return (
    <div className="flex flex-col">
      {LIBRARIES.map((lib) => (
        <button
          key={lib.id}
          type="button"
          onClick={() => onChange(lib.id)}
          className={`border-b border-[var(--line)] px-0 py-sp-5 text-left text-label-sm font-bold transition-colors ${
            value === lib.id
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {lib.label}
        </button>
      ))}
    </div>
  );
}
