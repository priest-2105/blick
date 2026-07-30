"use client";

import Link from "next/link";
import { useAnimationFrame } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { IconMeta } from "../../../types/icon";
import { animationRegistry, getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { getPrecomputedLength } from "@/lib/animation/path-length";
import type { AnimationDefinition, ProgressStyle } from "@/lib/animation/types";
import { useProjectStore } from "@/lib/state/project-store";
import ParamControls from "@/components/detail/ParamControls";

type StrokeDirection = "forward" | "backward" | "center-out";

interface AnimationSequence {
  id: string;
  name: string;
  pathIndexes: number[];
  animationId: string;
  params: Record<string, unknown>;
  durationMs: number;
  delayMs: number;
  direction: StrokeDirection;
  reverse: boolean;
}

const HOLD_MS = 700;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function defaultParams(definition: AnimationDefinition | undefined) {
  if (!definition) return {};
  return Object.fromEntries(
    Object.entries(definition.paramsSchema).map(([key, schema]) => [key, schema.default]),
  );
}

function createSequence({
  index,
  icon,
  pathIndexes,
}: {
  index: number;
  icon: IconMeta;
  pathIndexes: number[];
}): AnimationSequence {
  const animation = getAvailableAnimations(icon.isStrokeBased)[0] ?? animationRegistry[0];
  return {
    id: `${Date.now()}-${index}`,
    name: `Sequence ${index + 1}`,
    pathIndexes,
    animationId: animation.id,
    params: defaultParams(animation),
    durationMs: animation.defaultDurationMs,
    delayMs: 0,
    direction: "forward",
    reverse: false,
  };
}

function sequenceEnd(sequence: AnimationSequence) {
  return sequence.delayMs + sequence.durationMs;
}

function timelineDuration(sequences: AnimationSequence[]) {
  return sequences.reduce((total, sequence) => total + sequenceEnd(sequence), 0);
}

function drawStrokeStyle({
  icon,
  pathIndex,
  progress,
  direction,
}: {
  icon: IconMeta;
  pathIndex: number;
  progress: number;
  direction: StrokeDirection;
}) {
  const length = getPrecomputedLength(icon, pathIndex);
  if (direction === "center-out") {
    const drawn = length * progress;
    return {
      opacity: progress,
      strokeDasharray: `${drawn} ${Math.max(0, length - drawn)}`,
      strokeDashoffset: length * (1 - progress) * 0.5,
    };
  }

  const offset = length * (1 - progress);
  return {
    opacity: progress,
    strokeDasharray: `${length}`,
    strokeDashoffset: direction === "backward" ? -offset : offset,
  };
}

function applyElementStyle(node: SVGPathElement, style: ProgressStyle["elements"][number]) {
  node.style.opacity = style.opacity !== undefined ? `${style.opacity}` : "1";
  node.style.strokeDasharray = style.strokeDasharray ?? "";
  node.style.strokeDashoffset =
    style.strokeDashoffset !== undefined ? `${style.strokeDashoffset}` : "";
  node.style.transform = style.transform ?? "";
}

function SequencePreview({
  icon,
  color,
  sequences,
  activeSequenceId,
}: {
  icon: IconMeta;
  color: string;
  sequences: AnimationSequence[];
  activeSequenceId: string | null;
}) {
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sequenceOffsets = useMemo(() => {
    return sequences.reduce<Array<{ id: string; start: number; end: number }>>((offsets, sequence) => {
      const previousEnd = offsets.at(-1)?.end ?? 0;
      const start = previousEnd + sequence.delayMs;
      const end = start + sequence.durationMs;
      return [...offsets, { id: sequence.id, start, end }];
    }, []);
  }, [sequences]);
  const totalMs = Math.max(1, timelineDuration(sequences));
  const assignedPaths = useMemo(
    () => new Set(sequences.flatMap((sequence) => sequence.pathIndexes)),
    [sequences],
  );

  useAnimationFrame((time) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) % (totalMs + HOLD_MS);
    const nodes = pathRefs.current;

    if (svgRef.current) {
      svgRef.current.style.opacity = "";
      svgRef.current.style.transform = "";
    }

    icon.paths.forEach((_, index) => {
      const node = nodes[index];
      if (!node) return;
      node.style.opacity = assignedPaths.has(index) ? "0" : "0.18";
      node.style.strokeDasharray = "";
      node.style.strokeDashoffset = "";
      node.style.transform = "";
    });

    sequences.forEach((sequence, sequenceIndex) => {
      const offset = sequenceOffsets[sequenceIndex];
      const definition = getAnimation(sequence.animationId);
      if (!offset || !definition) return;

      let local = 0;
      if (elapsed >= offset.end) local = 1;
      else if (elapsed >= offset.start) local = clamp01((elapsed - offset.start) / sequence.durationMs);
      else local = 0;

      const progress = sequence.reverse ? 1 - local : local;
      const isActive = elapsed >= offset.start && elapsed < offset.end;
      const isSelected = activeSequenceId === sequence.id;
      const emphasisOpacity = isSelected || isActive ? 1 : 0.78;

      let computed: ProgressStyle | null = null;
      if (definition.id !== "draw-on") {
        computed = definition.computeStyle(progress, sequence.params, icon);
      }

      sequence.pathIndexes.forEach((pathIndex) => {
        const node = nodes[pathIndex];
        if (!node) return;

        if (definition.id === "draw-on") {
          applyElementStyle(
            node,
            drawStrokeStyle({
              icon,
              pathIndex,
              progress,
              direction: sequence.direction,
            }),
          );
          node.style.opacity = `${Number(node.style.opacity || 1) * emphasisOpacity}`;
          return;
        }

        const style = computed?.elements[pathIndex] ?? { opacity: progress };
        applyElementStyle(node, {
          ...style,
          opacity: (style.opacity ?? 1) * emphasisOpacity,
        });
      });
    });
  });

  return (
    <svg
      ref={svgRef}
      viewBox={icon.viewBox}
      className="h-full w-full"
      style={{ color, transformBox: "fill-box", transformOrigin: "center" }}
      fill={icon.isStrokeBased ? "none" : "currentColor"}
      stroke={icon.isStrokeBased ? "currentColor" : "none"}
    >
      {icon.paths.map((path, index) => (
        <path
          key={index}
          ref={(node) => {
            pathRefs.current[index] = node;
          }}
          d={path.attrs.d}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
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
  );
}

export default function WorkshopPage() {
  const { icon, color } = useProjectStore();

  if (!icon) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-[var(--foreground)]">
        <div className="max-w-md border border-[var(--line)] bg-[var(--surface)] p-6">
          <h1 className="font-[family-name:var(--font-panchang)] text-2xl font-bold">Workshop</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Select or upload an SVG first, then use sequences to animate its strokes.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-10 items-center bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--active-ink)]"
          >
            Choose an icon
          </Link>
        </div>
      </main>
    );
  }

  return <WorkshopEditor key={`${icon.library}-${icon.name}-${icon.paths.length}`} icon={icon} color={color} />;
}

function WorkshopEditor({ icon, color }: { icon: IconMeta; color: string }) {
  const [sequences, setSequences] = useState<AnimationSequence[]>(() => [
    createSequence({
      index: 0,
      icon,
      pathIndexes: icon.paths.map((_, index) => index),
    }),
  ]);
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(() => sequences[0]?.id ?? null);

  const activeSequence =
    sequences.find((sequence) => sequence.id === activeSequenceId) ?? sequences[0] ?? null;
  const availableAnimations = getAvailableAnimations(icon.isStrokeBased);
  const activeDefinition = activeSequence ? getAnimation(activeSequence.animationId) : undefined;
  const totalMs = timelineDuration(sequences);

  const updateSequence = (id: string, patch: Partial<AnimationSequence>) => {
    setSequences((current) =>
      current.map((sequence) => (sequence.id === id ? { ...sequence, ...patch } : sequence)),
    );
  };

  const updateSequenceParam = (id: string, key: string, value: unknown) => {
    setSequences((current) =>
      current.map((sequence) =>
        sequence.id === id
          ? { ...sequence, params: { ...sequence.params, [key]: value } }
          : sequence,
      ),
    );
  };

  const addSequence = () => {
    const next = createSequence({
      index: sequences.length,
      icon,
      pathIndexes: [],
    });
    setSequences((current) => [...current, next]);
    setActiveSequenceId(next.id);
  };

  const removeSequence = (id: string) => {
    const next = sequences.filter((sequence) => sequence.id !== id);
    setSequences(next);
    if (activeSequenceId === id) setActiveSequenceId(next[0]?.id ?? null);
  };

  const togglePath = (pathIndex: number) => {
    if (!activeSequence) return;
    const exists = activeSequence.pathIndexes.includes(pathIndex);
    updateSequence(activeSequence.id, {
      pathIndexes: exists
        ? activeSequence.pathIndexes.filter((index) => index !== pathIndex)
        : [...activeSequence.pathIndexes, pathIndex].sort((a, b) => a - b),
    });
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="grid min-h-32 border-b border-[var(--line)] md:grid-cols-[26%_12%_12%_12%_12%_1fr]">
        <div className="flex min-h-32 items-start border-b border-[var(--line)] p-6 md:border-b-0 md:border-r">
          <div>
            <Link
              href="/"
              className="font-[family-name:var(--font-panchang)] text-4xl font-extrabold leading-none tracking-normal"
            >
              Blick
              <sup className="ml-1 align-super text-xs font-extrabold">TM</sup>
            </Link>
            <p className="mt-3 max-w-48 text-xs leading-5 text-[var(--muted)]">
              Animation sequence workshop
            </p>
          </div>
        </div>
        <div className="hidden border-r border-[var(--line)] p-5 md:block">
          <p className="text-sm font-bold">Icons</p>
          <p className="mt-8 text-xs font-bold text-[var(--foreground)]">{icon.paths.length}</p>
        </div>
        <Link href="/" className="hidden border-r border-[var(--line)] p-5 text-[var(--subtle)] md:block">
          <p className="text-sm font-bold">Browse</p>
        </Link>
        <div className="hidden border-r border-[var(--line)] bg-[var(--active)] p-5 text-[var(--active-ink)] md:block">
          <p className="text-sm font-bold">Animate</p>
          <p className="mt-8 text-xs font-bold">{sequences.length} seq</p>
        </div>
        <div className="hidden border-r border-[var(--line)] p-5 text-[var(--subtle)] md:block">
          <p className="text-sm font-bold">Export</p>
        </div>
        <div className="p-5 text-xs text-[var(--muted)]">
          <p>{icon.library}</p>
          <p className="mt-2 truncate text-[var(--foreground)]">{icon.name}</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)_390px]">
        <aside className="min-h-0 overflow-y-auto border-b border-[var(--line)] bg-[var(--surface)] md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-[var(--line)] p-4">
            <div>
              <h2 className="text-lg font-semibold">Sequences</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">{totalMs}ms total</p>
            </div>
            <button
              type="button"
              onClick={addSequence}
              className="min-h-9 bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--active-ink)]"
            >
              Add
            </button>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {sequences.map((sequence, index) => (
              <button
                key={sequence.id}
                type="button"
                onClick={() => setActiveSequenceId(sequence.id)}
                className={`w-full p-4 text-left transition-colors ${
                  activeSequence?.id === sequence.id
                    ? "bg-[var(--active)] text-[var(--active-ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="block text-sm font-semibold">{sequence.name}</span>
                <span className="mt-2 block text-xs">
                  {index + 1} / {sequence.pathIndexes.length} strokes / {sequence.durationMs}ms
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] border-b border-[var(--line)] md:border-b-0 md:border-r">
          <div className="grid min-h-0 place-items-center p-8">
            <div className="grid aspect-square w-full max-w-[540px] place-items-center border border-[var(--line-strong)] bg-[var(--panel)] p-16">
              <div className="h-full w-full max-w-80">
                <SequencePreview
                  icon={icon}
                  color={color}
                  sequences={sequences}
                  activeSequenceId={activeSequence?.id ?? null}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--line)] p-4">
            <div className="flex h-8 overflow-hidden border border-[var(--line)]">
              {sequences.map((sequence) => {
                const width = totalMs > 0 ? (sequenceEnd(sequence) / totalMs) * 100 : 0;
                return (
                  <button
                    key={sequence.id}
                    type="button"
                    onClick={() => setActiveSequenceId(sequence.id)}
                    className={`h-full border-r border-[var(--background)] text-[10px] ${
                      activeSequence?.id === sequence.id
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

        <aside className="min-h-0 overflow-y-auto bg-[var(--surface)]">
          {activeSequence && activeDefinition ? (
            <div className="space-y-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{activeSequence.name}</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Configure this sequence, then add another to continue the timeline.
                  </p>
                </div>
                {sequences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSequence(activeSequence.id)}
                    className="text-xs text-[var(--accent)] hover:text-[var(--active)]"
                  >
                    Delete
                  </button>
                )}
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
                Name
                <input
                  value={activeSequence.name}
                  onChange={(event) => updateSequence(activeSequence.id, { name: event.target.value })}
                  className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
                Animation
                <select
                  value={activeSequence.animationId}
                  onChange={(event) => {
                    const definition = getAnimation(event.target.value);
                    updateSequence(activeSequence.id, {
                      animationId: event.target.value,
                      durationMs: definition?.defaultDurationMs ?? activeSequence.durationMs,
                      params: defaultParams(definition),
                    });
                  }}
                  className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {availableAnimations.map((animation) => (
                    <option key={animation.id} value={animation.id}>
                      {animation.name}
                    </option>
                  ))}
                </select>
              </label>

              <ParamControls
                definition={activeDefinition}
                params={activeSequence.params}
                durationMs={activeSequence.durationMs}
                onParamChange={(key, value) => updateSequenceParam(activeSequence.id, key, value)}
                onDurationChange={(durationMs) => updateSequence(activeSequence.id, { durationMs })}
              />

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
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
                  onChange={(event) =>
                    updateSequence(activeSequence.id, { delayMs: Number(event.target.value) })
                  }
                  className="h-2 cursor-pointer accent-[var(--accent)]"
                />
              </label>

              {activeSequence.animationId === "draw-on" && (
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
                  Direction
                  <select
                    value={activeSequence.direction}
                    onChange={(event) =>
                      updateSequence(activeSequence.id, {
                        direction: event.target.value as StrokeDirection,
                      })
                    }
                    className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="forward">Forward</option>
                    <option value="backward">Backward</option>
                    <option value="center-out">Center out</option>
                  </select>
                </label>
              )}

              <label className="flex items-center justify-between gap-4 border border-[var(--line)] bg-[var(--background)] p-3 text-sm text-[var(--muted)]">
                Reverse this sequence
                <input
                  type="checkbox"
                  checked={activeSequence.reverse}
                  onChange={(event) =>
                    updateSequence(activeSequence.id, { reverse: event.target.checked })
                  }
                  className="h-5 w-5 accent-[var(--accent)]"
                />
              </label>

              <div className="border border-[var(--line)]">
                <div className="flex items-center justify-between border-b border-[var(--line)] p-3">
                  <span className="text-sm font-medium text-[var(--muted)]">Strokes in sequence</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSequence(activeSequence.id, {
                        pathIndexes:
                          activeSequence.pathIndexes.length === icon.paths.length
                            ? []
                            : icon.paths.map((_, index) => index),
                      })
                    }
                    className="text-xs text-[var(--accent)] hover:text-[var(--active)]"
                  >
                    {activeSequence.pathIndexes.length === icon.paths.length ? "Clear" : "Select all"}
                  </button>
                </div>
                <div className="grid max-h-72 grid-cols-5 overflow-y-auto">
                  {icon.paths.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => togglePath(index)}
                      className={`border-b border-r border-[var(--line)] px-3 py-2 text-sm transition-colors ${
                        activeSequence.pathIndexes.includes(index)
                          ? "bg-[var(--accent)] text-[var(--active-ink)]"
                          : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 text-sm text-[var(--muted)]">Create a sequence to begin.</div>
          )}
        </aside>
      </div>
    </main>
  );
}
