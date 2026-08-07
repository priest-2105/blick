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
    <aside className="flex w-sp-16 shrink-0 flex-col overflow-y-auto border-r border-[var(--line)] bg-[var(--background)]">
      <div className="border-b border-[var(--line)] p-sp-6">
        <div className="flex items-center gap-sp-5">
          <div className="grid h-sp-9 w-sp-9 place-items-center rounded-sm bg-[var(--accent)] text-label-lg font-black leading-none text-[var(--active-ink)]">
            *
          </div>
          <span className="text-subheading-sm font-bold text-[var(--foreground)]">
            Blick
          </span>
        </div>
      </div>

      <div className="border-b border-[var(--line)] p-sp-6">
        <h3 className="mb-sp-5 text-subheading-xs font-bold text-[var(--muted)]">
          Technique
        </h3>
        <TechniqueFilter value={technique} onChange={onTechniqueChange} />
      </div>

      <div className="p-sp-6">
        <h3 className="mb-sp-5 text-subheading-xs font-bold text-[var(--muted)]">
          Libraries
        </h3>
        <LibraryFilter value={library} onChange={onLibraryChange} />
      </div>
    </aside>
  );
}
