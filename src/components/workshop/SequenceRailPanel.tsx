"use client";

import { Reorder } from "framer-motion";
import ExportActions from "@/components/export/ExportActions";
import type { ExportPayload } from "@/lib/export/animated-svg";
import SequenceRailItem from "./SequenceRailItem";
import type { AnimationSequence } from "@/lib/workshop/sequences";

export default function SequenceRailPanel({
  totalMs,
  sequences,
  onReorder,
  offsets,
  activeSequenceId,
  onAddSequence,
  onApplyPreset,
  onSelectSequence,
  onDuplicateSequence,
  onDeleteSequence,
  exportPayload,
}: {
  totalMs: number;
  sequences: AnimationSequence[];
  onReorder: (next: AnimationSequence[]) => void;
  offsets: Array<{ id: string; start: number; end: number }>;
  activeSequenceId: string | null;
  onAddSequence: () => void;
  onApplyPreset: (preset: "draw-pulse" | "stagger-pop" | "logo-intro") => void;
  onSelectSequence: (id: string) => void;
  onDuplicateSequence: (sequence: AnimationSequence) => void;
  onDeleteSequence: (id: string) => void;
  exportPayload: ExportPayload;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-b border-[var(--line)] bg-[var(--surface)] md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b border-[var(--line)] p-sp-6">
        <div>
          <h2 className="text-label-lg font-semibold">Sequences</h2>
          <p className="mt-sp-3 text-label-xs text-[var(--muted)]">{totalMs}ms total</p>
        </div>
        <button
          type="button"
          onClick={onAddSequence}
          className="min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-5 text-label-xs font-semibold text-[var(--active-ink)]"
        >
          Add
        </button>
      </div>
      <div className="grid grid-cols-3 border-b border-[var(--line)] text-[10px] font-semibold text-[var(--muted)]">
        <button
          type="button"
          onClick={() => onApplyPreset("draw-pulse")}
          className="min-h-sp-10 border-r border-[var(--line)] px-sp-4 hover:bg-[var(--panel)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
        >
          Draw
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset("stagger-pop")}
          className="min-h-sp-10 border-r border-[var(--line)] px-sp-4 hover:bg-[var(--panel)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
        >
          Stagger
        </button>
        <button
          type="button"
          onClick={() => onApplyPreset("logo-intro")}
          className="min-h-sp-10 px-sp-4 hover:bg-[var(--panel)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
        >
          Logo
        </button>
      </div>
      <Reorder.Group
        axis="y"
        values={sequences}
        onReorder={onReorder}
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto"
      >
        {sequences.map((sequence, index) => {
          const offset = offsets[index];
          return (
            <SequenceRailItem
              key={sequence.id}
              sequence={sequence}
              index={index}
              offset={offset}
              isActive={activeSequenceId === sequence.id}
              canDelete={sequences.length > 1}
              onSelect={() => onSelectSequence(sequence.id)}
              onDuplicate={() => onDuplicateSequence(sequence)}
              onDelete={() => onDeleteSequence(sequence.id)}
            />
          );
        })}
      </Reorder.Group>
      <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] p-sp-6">
        <ExportActions payload={exportPayload} label="Export animation" fullWidth />
      </div>
    </aside>
  );
}
