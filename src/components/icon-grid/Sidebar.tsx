"use client";

import type { IconLibrary } from "../../../types/icon";
import LibraryFilter from "./LibraryFilter";
import TechniqueFilter, { type Technique } from "./TechniqueFilter";

export default function Sidebar({
  library,
  onLibraryChange,
  technique,
  onTechniqueChange,
}: {
  library: IconLibrary | "all";
  onLibraryChange: (v: IconLibrary | "all") => void;
  technique: Technique;
  onTechniqueChange: (v: Technique) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-[var(--line)] bg-[var(--background)]">
      <div className="border-b border-[var(--line)] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center bg-[var(--accent)] text-lg font-black leading-none text-[var(--active-ink)]">
            *
          </div>
          <span className="font-[family-name:var(--font-panchang)] text-sm font-bold text-[var(--foreground)]">
            Blick
          </span>
        </div>
      </div>

      <div className="border-b border-[var(--line)] p-4">
        <h3 className="mb-3 text-xs font-bold text-[var(--muted)]">
          Technique
        </h3>
        <TechniqueFilter value={technique} onChange={onTechniqueChange} />
      </div>

      <div className="p-4">
        <h3 className="mb-3 text-xs font-bold text-[var(--muted)]">
          Libraries
        </h3>
        <LibraryFilter value={library} onChange={onLibraryChange} />
      </div>
    </aside>
  );
}
