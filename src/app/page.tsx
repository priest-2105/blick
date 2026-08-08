"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IconLibrary, IconSearchEntry } from "../../types/icon";
import { loadPreviewIndex, loadSearchIndex } from "@/lib/icons/manifest";
import { createIconSearcher } from "@/lib/icons/search";
import IconGrid from "@/components/icon-grid/IconGrid";
import LibraryBrowseView from "@/components/icon-grid/LibraryBrowseView";
import SearchBar from "@/components/icon-grid/SearchBar";
import Sidebar from "@/components/icon-grid/Sidebar";
import SvgUploadButton from "@/components/icon-grid/SvgUploadButton";
import type { Technique } from "@/components/icon-grid/TechniqueFilter";
import IconDetailPanel from "@/components/detail/IconDetailPanel";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function Home() {
  const [previewEntries, setPreviewEntries] = useState<IconSearchEntry[]>([]);
  const [fullEntries, setFullEntries] = useState<IconSearchEntry[] | null>(null);
  const fullFetchStarted = useRef(false);

  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState<IconLibrary | "all">("all");
  const [technique, setTechnique] = useState<Technique>("all");
  const [selected, setSelected] = useState<IconSearchEntry | null>(null);

  const debouncedQuery = useDebounced(query, 200);

  useEffect(() => {
    loadPreviewIndex().then(setPreviewEntries);
  }, []);

  useEffect(() => {
    const wantsFullData =
      debouncedQuery.trim().length > 0 || library !== "all" || technique !== "all";
    if (wantsFullData && !fullFetchStarted.current) {
      fullFetchStarted.current = true;
      loadSearchIndex().then(setFullEntries);
    }
  }, [debouncedQuery, library, technique]);

  const activeEntries = fullEntries ?? previewEntries;
  const search = useMemo(() => createIconSearcher(activeEntries), [activeEntries]);

  const filtered = useMemo(() => {
    let results = search(debouncedQuery);
    if (library !== "all") results = results.filter((r) => r.library === library);
    if (technique !== "all") {
      const wantsStroke = technique === "stroke";
      results = results.filter((r) => r.isStrokeBased === wantsStroke);
    }
    return results;
  }, [search, debouncedQuery, library, technique]);

  const isDefaultBrowse =
    debouncedQuery.trim().length === 0 && library === "all" && technique === "all";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="grid min-h-sp-15 border-b border-[var(--line)] md:grid-cols-[26%_12%_12%_12%_12%_1fr]">
        <div className="flex min-h-sp-15 items-start border-b border-[var(--line)] p-sp-8 md:border-b-0 md:border-r">
          <div>
            <h1 className="flex items-center leading-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/blick-logo.svg" alt="Blick" className="h-sp-10 w-auto" />
              {/* <sup className="ml-sp-3 align-super text-label-xs font-extrabold text-[var(--foreground)]">TM</sup> */}
            </h1>
            <p className="mt-sp-5 max-w-48 text-label-xs leading-5 text-[var(--muted)]">
              Animated icon library workspace
            </p>
          </div>
        </div>

        <div className="hidden border-r border-[var(--line)] p-sp-7 md:block">
          <p className="text-subheading-sm font-bold">Icons</p>
          <p className="mt-sp-9 text-label-xs font-bold text-[var(--foreground)]">
            {filtered.length.toLocaleString()}
          </p>
        </div>

        <div className="hidden bg-[var(--active)] p-sp-7 text-[var(--active-ink)] md:block">
          <p className="text-subheading-sm font-bold">Browse</p>
          <p className="mt-sp-9 text-label-xs font-bold">{fullEntries === null ? "Preview" : "Full"}</p>
        </div>

        <div className="hidden border-x border-[var(--line)] p-sp-7 text-[var(--subtle)] md:block">
          <p className="text-subheading-sm font-bold">Animate</p>
        </div>

        <div className="hidden border-r border-[var(--line)] p-sp-7 text-[var(--subtle)] md:block">
          <p className="text-subheading-sm font-bold">Export</p>
        </div>

        <div className="flex items-start justify-end gap-sp-7 p-sp-7">
          <SvgUploadButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          library={library}
          onLibraryChange={setLibrary}
          technique={technique}
          onTechniqueChange={setTechnique}
        />

        <main className="min-w-0 flex-1 overflow-hidden border-r border-[var(--line)]">
          <div className="flex h-sp-11 items-center justify-between gap-sp-6 border-b border-[var(--line)] px-sp-6 text-label-xs text-[var(--muted)]">
            <SearchBar value={query} onChange={setQuery} className="max-w-md" />
            <div className="flex shrink-0 items-center gap-sp-6">
              <span className="hidden sm:inline">
                {selected ? `${selected.name} selected` : "No styles selected"}
              </span>
            </div>
          </div>
          <div className="h-[calc(100%-var(--spacing-sp-11))]">
            {isDefaultBrowse ? (
              <LibraryBrowseView entries={filtered} onSelect={setSelected} />
            ) : (
              <IconGrid entries={filtered} onSelect={setSelected} />
            )}
          </div>
        </main>
      </div>

      {selected && <IconDetailPanel entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
