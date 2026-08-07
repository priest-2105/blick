"use client";

import type { IconMeta } from "../../../types/icon";
import type { AnimationDefinition } from "@/lib/animation/types";
import { getAnimation } from "@/lib/animation/registry";
import ParamControls from "@/components/detail/ParamControls";
import type { GlyphName } from "./Glyph";
import IconButton from "./IconButton";
import {
  defaultParams,
  formatTime,
  triggerLabel,
  type AnimationSequence,
  type SequenceTrigger,
  type StrokeDirection,
} from "@/lib/workshop/sequences";

export default function SequenceDetailsPanel({
  icon,
  activeSequence,
  activeDefinition,
  activeOffset,
  availableAnimations,
  hoveredPathIndex,
  onHoverPath,
  canDelete,
  onUpdateSequence,
  onUpdateSequenceParam,
  onDeleteSequence,
  onTogglePath,
}: {
  icon: IconMeta;
  activeSequence: AnimationSequence;
  activeDefinition: AnimationDefinition | undefined;
  activeOffset: { start: number; end: number } | undefined;
  availableAnimations: AnimationDefinition[];
  hoveredPathIndex: number | null;
  onHoverPath: (pathIndex: number | null) => void;
  canDelete: boolean;
  onUpdateSequence: (id: string, patch: Partial<AnimationSequence>) => void;
  onUpdateSequenceParam: (id: string, key: string, value: unknown) => void;
  onDeleteSequence: (id: string) => void;
  onTogglePath: (pathIndex: number) => void;
}) {
  return (
    <div className="space-y-sp-7 p-sp-7">
      <div className="flex items-start justify-between gap-sp-6">
        <div>
          <h2 className="text-label-lg font-semibold">{activeSequence.name}</h2>
          <div className="mt-sp-5 grid grid-cols-3 border border-[var(--line)] text-label-xs">
            <div className="border-r border-[var(--line)] p-sp-4">
              <p className="text-[var(--subtle)]">Start</p>
              <p className="mt-sp-3 font-semibold text-[var(--foreground)]">
                {formatTime(activeOffset?.start ?? 0)}
              </p>
            </div>
            <div className="border-r border-[var(--line)] p-sp-4">
              <p className="text-[var(--subtle)]">End</p>
              <p className="mt-sp-3 font-semibold text-[var(--foreground)]">
                {formatTime(activeOffset?.end ?? activeSequence.durationMs)}
              </p>
            </div>
            <div className="p-sp-4">
              <p className="text-[var(--subtle)]">Paths</p>
              <p className="mt-sp-3 font-semibold text-[var(--foreground)]">
                {activeSequence.pathIndexes.length}/{icon.paths.length}
              </p>
            </div>
          </div>
        </div>
        {canDelete && (
          <IconButton
            label={`Delete ${activeSequence.name}`}
            icon="trash"
            onClick={() => onDeleteSequence(activeSequence.id)}
          />
        )}
      </div>

      <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
        Name
        <input
          value={activeSequence.name}
          onChange={(event) => onUpdateSequence(activeSequence.id, { name: event.target.value })}
          className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </label>

      <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
        Animation
        <select
          value={activeSequence.animationId}
          onChange={(event) => {
            const definition = getAnimation(event.target.value);
            onUpdateSequence(activeSequence.id, {
              animationId: event.target.value,
              durationMs: definition?.defaultDurationMs ?? activeSequence.durationMs,
              params: defaultParams(definition),
            });
          }}
          className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {availableAnimations.map((animation) => (
            <option key={animation.id} value={animation.id}>
              {animation.name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-sp-4">
        <div className="flex items-center justify-between text-label-sm font-medium text-[var(--muted)]">
          <span>Trigger</span>
          <span className="text-label-xs text-[var(--foreground)]">{triggerLabel(activeSequence.trigger)}</span>
        </div>
        <div className="grid grid-cols-3 gap-sp-4">
          {(
            [
              ["auto", "auto", "Auto timeline"],
              ["hover-in", "hover", "Run when target is hovered"],
              ["hover-out", "leave", "Run when hover leaves target"],
            ] as const
          ).map(([value, iconName, label]) => (
            <IconButton
              key={value}
              label={label}
              icon={iconName as GlyphName}
              active={activeSequence.trigger === value}
              onClick={() => onUpdateSequence(activeSequence.id, { trigger: value as SequenceTrigger })}
            />
          ))}
        </div>
      </div>

      {activeDefinition && (
        <ParamControls
          definition={activeDefinition}
          params={activeSequence.params}
          durationMs={activeSequence.durationMs}
          onParamChange={(key, value) => onUpdateSequenceParam(activeSequence.id, key, value)}
          onDurationChange={(durationMs) => onUpdateSequence(activeSequence.id, { durationMs })}
        />
      )}

      <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
        <span className="flex items-center justify-between">
          Delay before start
          <span className="text-[var(--foreground)]">{activeSequence.delayMs}ms</span>
        </span>
        <input
          type="range"
          min={0}
          max={2000}
          step={100}
          value={activeSequence.delayMs}
          onChange={(event) => onUpdateSequence(activeSequence.id, { delayMs: Number(event.target.value) })}
          className="h-sp-4 cursor-pointer accent-[var(--accent)]"
        />
      </label>

      {activeSequence.animationId === "draw-on" && (
        <div className="space-y-sp-4">
          <div className="flex items-center justify-between text-label-sm font-medium text-[var(--muted)]">
            <span>Direction</span>
            <span className="text-label-xs text-[var(--foreground)]">{activeSequence.direction}</span>
          </div>
          <div className="grid grid-cols-3 gap-sp-4">
            {(
              [
                ["forward", "forward", "Draw forward"],
                ["backward", "backward", "Draw backward"],
                ["center-out", "center", "Draw from center outward"],
              ] as const
            ).map(([value, iconName, label]) => (
              <IconButton
                key={value}
                label={label}
                icon={iconName as GlyphName}
                active={activeSequence.direction === value}
                onClick={() => onUpdateSequence(activeSequence.id, { direction: value as StrokeDirection })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-sp-5 border border-[var(--line)] bg-[var(--background)] p-sp-5">
        <span className="text-label-sm font-medium text-[var(--muted)]">Reverse</span>
        <IconButton
          label="Reverse sequence"
          icon="reverse"
          active={activeSequence.reverse}
          onClick={() => onUpdateSequence(activeSequence.id, { reverse: !activeSequence.reverse })}
        />
      </div>

      <div className="border border-[var(--line)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] p-sp-5">
          <span className="text-label-sm font-medium text-[var(--muted)]">Strokes in sequence</span>
          <button
            type="button"
            onClick={() =>
              onUpdateSequence(activeSequence.id, {
                pathIndexes:
                  activeSequence.pathIndexes.length === icon.paths.length
                    ? []
                    : icon.paths.map((_, index) => index),
              })
            }
            className="text-label-xs text-[var(--accent)] hover:text-[var(--active)]"
          >
            {activeSequence.pathIndexes.length === icon.paths.length ? "Clear" : "Select all"}
          </button>
        </div>
        <div className="grid max-h-72 grid-cols-5 overflow-y-auto">
          {icon.paths.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onTogglePath(index)}
              onMouseEnter={() => onHoverPath(index)}
              onMouseLeave={() => onHoverPath(null)}
              className={`border-b border-r border-[var(--line)] px-sp-5 py-sp-4 text-label-sm transition-colors ${
                activeSequence.pathIndexes.includes(index)
                  ? "bg-[var(--accent)] text-[var(--active-ink)]"
                  : hoveredPathIndex === index
                    ? "bg-[var(--panel)] text-[var(--accent)]"
                    : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
