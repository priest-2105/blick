"use client";

import { Reorder, useDragControls } from "framer-motion";
import Glyph from "./Glyph";
import { formatTime, triggerLabel, type AnimationSequence } from "@/lib/workshop/sequences";

export default function SequenceRailItem({
  sequence,
  index,
  offset,
  isActive,
  canDelete,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  sequence: AnimationSequence;
  index: number;
  offset: { start: number; end: number } | undefined;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const dragControls = useDragControls();
  const isEmpty = sequence.pathIndexes.length === 0;
  const triggerIcon =
    sequence.trigger === "hover-in" ? "hover" : sequence.trigger === "hover-out" ? "leave" : "auto";

  return (
    <Reorder.Item
      value={sequence}
      dragListener={false}
      dragControls={dragControls}
      className={`border-b border-[var(--line)] transition-colors ${
        isActive
          ? "bg-[var(--active)] text-[var(--active-ink)]"
          : isEmpty
            ? "bg-[var(--background)] text-[var(--subtle)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
          : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
      }`}
      whileDrag={{
        scale: 1.025,
        zIndex: 20,
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="grid grid-cols-[var(--spacing-sp-10)_minmax(0,1fr)]">
        <button
          type="button"
          onPointerDown={(event) => dragControls.start(event)}
          className="grid cursor-grab place-items-center border-r border-current/15 text-current/70 active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
          aria-label={`Drag ${sequence.name}`}
        >
          <span className="grid grid-cols-2 gap-sp-3" aria-hidden="true">
            <span className="h-sp-3 w-sp-3 rounded-full bg-current" />
            <span className="h-sp-3 w-sp-3 rounded-full bg-current" />
            <span className="h-sp-3 w-sp-3 rounded-full bg-current" />
            <span className="h-sp-3 w-sp-3 rounded-full bg-current" />
            <span className="h-sp-3 w-sp-3 rounded-full bg-current" />
            <span className="h-sp-3 w-sp-3 rounded-full bg-current" />
          </span>
        </button>
        <div>
          <button
            type="button"
            onClick={onSelect}
            className="w-full p-sp-6 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
          >
            <span className="flex items-center justify-between gap-sp-5">
              <span className="min-w-0 truncate text-label-sm font-semibold">{sequence.name}</span>
              <span
                className="inline-flex shrink-0 items-center gap-sp-3 text-[10px]"
                title={`Trigger: ${triggerLabel(sequence.trigger)}`}
              >
                <Glyph name={triggerIcon} className="h-sp-5 w-sp-5" />
                {formatTime(offset?.start ?? 0)}
              </span>
            </span>
            <span className="mt-sp-4 block text-label-xs">
              {index + 1} / {isEmpty ? "No strokes" : `${sequence.pathIndexes.length} strokes`} /{" "}
              {sequence.durationMs}ms
            </span>
            <span className="mt-sp-3 block text-[10px] opacity-80">
              {formatTime(offset?.start ?? 0)} - {formatTime(offset?.end ?? 0)}
            </span>
          </button>
          <div className="grid grid-cols-2 border-t border-current/15 text-[10px] font-semibold">
            <button
              type="button"
              title={`Duplicate ${sequence.name}`}
              aria-label={`Duplicate ${sequence.name}`}
              onClick={onDuplicate}
              className="grid min-h-sp-9 place-items-center border-r border-current/15 transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
            >
              <Glyph name="copy" className="h-sp-6 w-sp-6" />
            </button>
            <button
              type="button"
              title={`Delete ${sequence.name}`}
              aria-label={`Delete ${sequence.name}`}
              onClick={onDelete}
              disabled={!canDelete}
              className="grid min-h-sp-9 place-items-center transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Glyph name="trash" className="h-sp-6 w-sp-6" />
            </button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
