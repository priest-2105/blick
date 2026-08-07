"use client";

import type { IconMeta } from "../../../types/icon";
import Glyph from "./Glyph";
import IconButton from "./IconButton";
import SequencePreview from "./SequencePreview";
import {
  formatTime,
  sequenceEnd,
  type AnimationSequence,
  type PlaybackMode,
} from "@/lib/workshop/sequences";

export default function PreviewPane({
  icon,
  color,
  sequences,
  activeSequenceId,
  hoveredPathIndex,
  playheadMs,
  isPlaying,
  playbackMode,
  totalMs,
  canUndo,
  canRedo,
  onPathToggle,
  onPathHover,
  onPlayheadChange,
  onTogglePlaying,
  onReset,
  onUndo,
  onRedo,
  onPlaybackModeChange,
  onScrub,
  onSelectSequence,
}: {
  icon: IconMeta;
  color: string;
  sequences: AnimationSequence[];
  activeSequenceId: string | null;
  hoveredPathIndex: number | null;
  playheadMs: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  totalMs: number;
  canUndo: boolean;
  canRedo: boolean;
  onPathToggle: (pathIndex: number) => void;
  onPathHover: (pathIndex: number | null) => void;
  onPlayheadChange: (timeMs: number) => void;
  onTogglePlaying: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onScrub: (timeMs: number) => void;
  onSelectSequence: (id: string) => void;
}) {
  return (
    <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] border-b border-[var(--line)] md:border-b-0 md:border-r">
      <div className="grid min-h-0 place-items-center p-sp-9">
        <div className="grid aspect-square w-full max-w-[540px] place-items-center border border-[var(--line-strong)] bg-transparent p-sp-15">
          <div className="h-full w-full max-w-80">
            <SequencePreview
              icon={icon}
              color={color}
              sequences={sequences}
              activeSequenceId={activeSequenceId}
              hoveredPathIndex={hoveredPathIndex}
              playheadMs={playheadMs}
              isPlaying={isPlaying}
              playbackMode={playbackMode}
              onPathToggle={onPathToggle}
              onPathHover={onPathHover}
              onPlayheadChange={onPlayheadChange}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)] p-sp-6">
        <div className="mb-sp-5 flex flex-wrap items-center gap-sp-5">
          <IconButton
            label={isPlaying ? "Pause preview" : "Play preview"}
            icon={isPlaying ? "pause" : "play"}
            active
            onClick={onTogglePlaying}
          />
          <IconButton label="Reset preview" icon="reset" onClick={onReset} />
          <IconButton label="Undo sequence edit" icon="undo" disabled={!canUndo} onClick={onUndo} />
          <IconButton label="Redo sequence edit" icon="redo" disabled={!canRedo} onClick={onRedo} />
          <div className="flex rounded-sm border border-[var(--line-strong)]">
            <button
              type="button"
              title="Loop preview"
              aria-label="Loop preview"
              onClick={() => onPlaybackModeChange("loop")}
              className={`grid min-h-sp-10 min-w-sp-10 place-items-center ${
                playbackMode === "loop"
                  ? "bg-[var(--active)] text-[var(--active-ink)]"
                  : "bg-[var(--control)] text-[var(--foreground)] hover:text-[var(--accent)]"
              }`}
            >
              <Glyph name="loop" />
            </button>
            <button
              type="button"
              title="Play once"
              aria-label="Play once"
              onClick={() => onPlaybackModeChange("once")}
              className={`grid min-h-sp-10 min-w-sp-10 place-items-center border-l border-[var(--line-strong)] ${
                playbackMode === "once"
                  ? "bg-[var(--active)] text-[var(--active-ink)]"
                  : "bg-[var(--control)] text-[var(--foreground)] hover:text-[var(--accent)]"
              }`}
            >
              <Glyph name="once" />
            </button>
          </div>
          <span className="ml-auto text-label-xs text-[var(--muted)]">
            {formatTime(playheadMs)} / {formatTime(totalMs)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(1, totalMs)}
          step={16}
          value={Math.min(playheadMs, totalMs)}
          onChange={(event) => onScrub(Number(event.target.value))}
          className="mb-sp-5 h-sp-4 w-full cursor-pointer accent-[var(--accent)]"
          aria-label="Scrub animation timeline"
        />

        <div className="relative flex h-sp-10 overflow-hidden rounded-sm border border-[var(--line)]">
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[var(--foreground)]"
            style={{ left: `${totalMs > 0 ? (Math.min(playheadMs, totalMs) / totalMs) * 100 : 0}%` }}
          />
          {sequences.map((sequence) => {
            const width = totalMs > 0 ? (sequenceEnd(sequence) / totalMs) * 100 : 0;
            return (
              <button
                key={sequence.id}
                type="button"
                onClick={() => onSelectSequence(sequence.id)}
                className={`h-full border-r border-[var(--background)] text-[10px] font-semibold ${
                  activeSequenceId === sequence.id
                    ? "bg-[var(--accent)] text-[var(--active-ink)]"
                    : "bg-[var(--control)] text-[var(--muted)]"
                }`}
                style={{ width: `${Math.max(6, width)}%` }}
                title={`${sequence.name}: ${sequenceEnd(sequence)}ms`}
              >
                {sequence.name.replace("Sequence ", "S")}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
