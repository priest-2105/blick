"use client";

import Link from "next/link";
import { Reorder, useAnimationFrame, useDragControls } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IconMeta } from "../../../types/icon";
import { animationRegistry, getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { getPrecomputedLength } from "@/lib/animation/path-length";
import type { AnimationDefinition, ProgressStyle } from "@/lib/animation/types";
import ExportActions from "@/components/export/ExportActions";
import { useProjectStore } from "@/lib/state/project-store";
import ParamControls from "@/components/detail/ParamControls";

type StrokeDirection = "forward" | "backward" | "center-out";
type PlaybackMode = "loop" | "once";

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

interface DeletedSequence {
  sequence: AnimationSequence;
  index: number;
  activeSequenceId: string | null;
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
  id,
  index,
  icon,
  pathIndexes,
  animationId,
  name,
  delayMs = 0,
}: {
  id: string;
  index: number;
  icon: IconMeta;
  pathIndexes: number[];
  animationId?: string;
  name?: string;
  delayMs?: number;
}): AnimationSequence {
  const fallback = getAvailableAnimations(icon.isStrokeBased)[0] ?? animationRegistry[0];
  const requested = animationId ? getAnimation(animationId) : undefined;
  const animation =
    requested && (!requested.requiresStrokeBased || icon.isStrokeBased) ? requested : fallback;
  return {
    id,
    name: name ?? `Sequence ${index + 1}`,
    pathIndexes,
    animationId: animation.id,
    params: defaultParams(animation),
    durationMs: animation.defaultDurationMs,
    delayMs,
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

function sequenceOffsets(sequences: AnimationSequence[]) {
  return sequences.reduce<Array<{ id: string; start: number; end: number }>>((offsets, sequence) => {
    const previousEnd = offsets.at(-1)?.end ?? 0;
    const start = previousEnd + sequence.delayMs;
    const end = start + sequence.durationMs;
    return [...offsets, { id: sequence.id, start, end }];
  }, []);
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
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
  hoveredPathIndex,
  playheadMs,
  isPlaying,
  playbackMode,
  onPathToggle,
  onPathHover,
  onPlayheadChange,
}: {
  icon: IconMeta;
  color: string;
  sequences: AnimationSequence[];
  activeSequenceId: string | null;
  hoveredPathIndex: number | null;
  playheadMs: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  onPathToggle: (pathIndex: number) => void;
  onPathHover: (pathIndex: number | null) => void;
  onPlayheadChange: (timeMs: number) => void;
}) {
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastPublishedRef = useRef(0);
  const offsets = useMemo(() => sequenceOffsets(sequences), [sequences]);
  const totalMs = Math.max(1, timelineDuration(sequences));
  const activeSequence = sequences.find((sequence) => sequence.id === activeSequenceId) ?? null;
  const assignedPaths = useMemo(
    () => new Set(sequences.flatMap((sequence) => sequence.pathIndexes)),
    [sequences],
  );

  useAnimationFrame((time) => {
    if (startTimeRef.current === null) startTimeRef.current = time;
    if (!isPlaying) startTimeRef.current = time - playheadMs;
    const elapsedRaw = isPlaying ? time - startTimeRef.current : playheadMs;
    const elapsed =
      playbackMode === "loop" ? elapsedRaw % (totalMs + HOLD_MS) : Math.min(totalMs, elapsedRaw);
    const nodes = pathRefs.current;

    if (isPlaying && time - lastPublishedRef.current > 80) {
      lastPublishedRef.current = time;
      onPlayheadChange(Math.min(totalMs, elapsed));
    }

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
      node.style.filter = "";
    });

    sequences.forEach((sequence, sequenceIndex) => {
      const offset = offsets[sequenceIndex];
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

    activeSequence?.pathIndexes.forEach((pathIndex) => {
      const node = nodes[pathIndex];
      if (node) node.style.filter = "drop-shadow(0 0 6px color-mix(in oklch, var(--accent) 72%, transparent))";
    });

    if (hoveredPathIndex !== null) {
      const node = nodes[hoveredPathIndex];
      if (node) {
        node.style.opacity = "1";
        node.style.filter = "drop-shadow(0 0 9px var(--accent))";
      }
    }
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
          onClick={() => onPathToggle(index)}
          onMouseEnter={() => onPathHover(index)}
          onMouseLeave={() => onPathHover(null)}
          style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "center" }}
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

function SequenceRailItem({
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
        boxShadow: "0 8px 0 rgba(0,0,0,0.24)",
      }}
    >
      <div className="grid grid-cols-[36px_minmax(0,1fr)]">
        <button
          type="button"
          onPointerDown={(event) => dragControls.start(event)}
          className="grid cursor-grab place-items-center border-r border-current/15 text-current/70 active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
          aria-label={`Drag ${sequence.name}`}
        >
          <span className="grid grid-cols-2 gap-1" aria-hidden="true">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
        </button>
        <div>
          <button
            type="button"
            onClick={onSelect}
            className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold">{sequence.name}</span>
              <span className="shrink-0 text-[10px]">{formatTime(offset?.start ?? 0)}</span>
            </span>
            <span className="mt-2 block text-xs">
              {index + 1} / {isEmpty ? "No strokes" : `${sequence.pathIndexes.length} strokes`} /{" "}
              {sequence.durationMs}ms
            </span>
            <span className="mt-1 block text-[10px] opacity-80">
              {formatTime(offset?.start ?? 0)} - {formatTime(offset?.end ?? 0)}
            </span>
          </button>
          <div className="grid grid-cols-2 border-t border-current/15 text-[10px] font-semibold">
            <button
              type="button"
              onClick={onDuplicate}
              className="min-h-8 border-r border-current/15 transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
              className="min-h-8 transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Reorder.Item>
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
      id: "sequence-1",
      index: 0,
      icon,
      pathIndexes: icon.paths.map((_, index) => index),
    }),
  ]);
  const nextSequenceIdRef = useRef(2);
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(() => sequences[0]?.id ?? null);
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("loop");
  const [playheadMs, setPlayheadMs] = useState(0);
  const [deletedSequence, setDeletedSequence] = useState<DeletedSequence | null>(null);

  const activeSequence =
    sequences.find((sequence) => sequence.id === activeSequenceId) ?? sequences[0] ?? null;
  const availableAnimations = getAvailableAnimations(icon.isStrokeBased);
  const activeDefinition = activeSequence ? getAnimation(activeSequence.animationId) : undefined;
  const totalMs = timelineDuration(sequences);
  const offsets = useMemo(() => sequenceOffsets(sequences), [sequences]);
  const exportPayload = useMemo(
    () => ({
      icon,
      color,
      sequences,
    }),
    [icon, color, sequences],
  );
  const activeOffset = activeSequence
    ? offsets[sequences.findIndex((sequence) => sequence.id === activeSequence.id)]
    : undefined;

  useEffect(() => {
    if (!deletedSequence) return;
    const timeout = window.setTimeout(() => setDeletedSequence(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [deletedSequence]);

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
      id: `sequence-${nextSequenceIdRef.current}`,
      index: sequences.length,
      icon,
      pathIndexes: [],
    });
    nextSequenceIdRef.current += 1;
    setSequences((current) => [...current, next]);
    setActiveSequenceId(next.id);
  };

  const applyPreset = (preset: "draw-pulse" | "stagger-pop" | "logo-intro") => {
    const allPaths = icon.paths.map((_, index) => index);
    const midpoint = Math.max(1, Math.ceil(allPaths.length / 2));
    const nextId = () => {
      const id = `sequence-${nextSequenceIdRef.current}`;
      nextSequenceIdRef.current += 1;
      return id;
    };
    const next =
      preset === "draw-pulse"
        ? [
            createSequence({
              id: nextId(),
              index: 0,
              icon,
              pathIndexes: allPaths,
              animationId: icon.isStrokeBased ? "draw-on" : "fade-in",
              name: icon.isStrokeBased ? "Draw" : "Reveal",
            }),
            createSequence({
              id: nextId(),
              index: 1,
              icon,
              pathIndexes: allPaths,
              animationId: "pulse",
              name: "Settle",
              delayMs: 120,
            }),
          ]
        : preset === "stagger-pop"
          ? [
              createSequence({
                id: nextId(),
                index: 0,
                icon,
                pathIndexes: allPaths.slice(0, midpoint),
                animationId: "stagger-reveal",
                name: "Lead strokes",
              }),
              createSequence({
                id: nextId(),
                index: 1,
                icon,
                pathIndexes: allPaths.slice(midpoint),
                animationId: "pop-in",
                name: "Secondary pop",
                delayMs: 80,
              }),
            ]
          : [
              createSequence({
                id: nextId(),
                index: 0,
                icon,
                pathIndexes: allPaths,
                animationId: "rise-in",
                name: "Entrance",
              }),
              createSequence({
                id: nextId(),
                index: 1,
                icon,
                pathIndexes: allPaths,
                animationId: "spin-in",
                name: "Mark turn",
                delayMs: 80,
              }),
              createSequence({
                id: nextId(),
                index: 2,
                icon,
                pathIndexes: allPaths,
                animationId: "pulse",
                name: "Hold",
                delayMs: 120,
              }),
            ];

    setSequences(next);
    setActiveSequenceId(next[0]?.id ?? null);
    setPlayheadMs(0);
    setIsPlaying(true);
    setDeletedSequence(null);
  };

  const duplicateSequence = (sequence: AnimationSequence) => {
    const copy = {
      ...sequence,
      id: `sequence-${nextSequenceIdRef.current}`,
      name: `${sequence.name} copy`,
    };
    nextSequenceIdRef.current += 1;
    const sourceIndex = sequences.findIndex((item) => item.id === sequence.id);
    const next = [
      ...sequences.slice(0, sourceIndex + 1),
      copy,
      ...sequences.slice(sourceIndex + 1),
    ];
    setSequences(next);
    setActiveSequenceId(copy.id);
  };

  const removeSequence = (id: string) => {
    if (sequences.length === 1) return;
    const removedIndex = sequences.findIndex((sequence) => sequence.id === id);
    const removed = sequences[removedIndex];
    if (!removed) return;
    const next = sequences.filter((sequence) => sequence.id !== id);
    setSequences(next);
    if (activeSequenceId === id) setActiveSequenceId(next[0]?.id ?? null);
    setDeletedSequence({ sequence: removed, index: removedIndex, activeSequenceId });
  };

  const undoDelete = () => {
    if (!deletedSequence) return;
    const next = [
      ...sequences.slice(0, deletedSequence.index),
      deletedSequence.sequence,
      ...sequences.slice(deletedSequence.index),
    ];
    setSequences(next);
    setActiveSequenceId(deletedSequence.activeSequenceId ?? deletedSequence.sequence.id);
    setDeletedSequence(null);
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
          <ExportActions payload={exportPayload} />
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
          <div className="grid grid-cols-3 border-b border-[var(--line)] text-[10px] font-semibold text-[var(--muted)]">
            <button
              type="button"
              onClick={() => applyPreset("draw-pulse")}
              className="min-h-9 border-r border-[var(--line)] px-2 hover:bg-[var(--panel)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
            >
              Draw
            </button>
            <button
              type="button"
              onClick={() => applyPreset("stagger-pop")}
              className="min-h-9 border-r border-[var(--line)] px-2 hover:bg-[var(--panel)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
            >
              Stagger
            </button>
            <button
              type="button"
              onClick={() => applyPreset("logo-intro")}
              className="min-h-9 px-2 hover:bg-[var(--panel)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
            >
              Logo
            </button>
          </div>
          <Reorder.Group
            axis="y"
            values={sequences}
            onReorder={setSequences}
            className="touch-pan-y"
          >
            {sequences.map((sequence, index) => {
              const offset = offsets[index];
              return (
                <SequenceRailItem
                  key={sequence.id}
                  sequence={sequence}
                  index={index}
                  offset={offset}
                  isActive={activeSequence?.id === sequence.id}
                  canDelete={sequences.length > 1}
                  onSelect={() => setActiveSequenceId(sequence.id)}
                  onDuplicate={() => duplicateSequence(sequence)}
                  onDelete={() => removeSequence(sequence.id)}
                />
              );
            })}
          </Reorder.Group>
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
                  hoveredPathIndex={hoveredPathIndex}
                  playheadMs={playheadMs}
                  isPlaying={isPlaying}
                  playbackMode={playbackMode}
                  onPathToggle={togglePath}
                  onPathHover={setHoveredPathIndex}
                  onPlayheadChange={setPlayheadMs}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--line)] p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying((current) => !current)}
                className="min-h-9 min-w-20 bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--active-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setPlayheadMs(0);
                }}
                className="min-h-9 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                Reset
              </button>
              <select
                value={playbackMode}
                onChange={(event) => setPlaybackMode(event.target.value as PlaybackMode)}
                className="min-h-9 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="loop">Loop</option>
                <option value="once">Play once</option>
              </select>
              <span className="ml-auto text-xs text-[var(--muted)]">
                {formatTime(playheadMs)} / {formatTime(totalMs)}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(1, totalMs)}
              step={16}
              value={Math.min(playheadMs, totalMs)}
              onChange={(event) => {
                setIsPlaying(false);
                setPlayheadMs(Number(event.target.value));
              }}
              className="mb-3 h-2 w-full cursor-pointer accent-[var(--accent)]"
              aria-label="Scrub animation timeline"
            />

            <div className="relative flex h-9 overflow-hidden border border-[var(--line)]">
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
                    onClick={() => setActiveSequenceId(sequence.id)}
                    className={`h-full border-r border-[var(--background)] text-[10px] font-semibold ${
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
                  <div className="mt-3 grid grid-cols-3 border border-[var(--line)] text-xs">
                    <div className="border-r border-[var(--line)] p-2">
                      <p className="text-[var(--subtle)]">Start</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">
                        {formatTime(activeOffset?.start ?? 0)}
                      </p>
                    </div>
                    <div className="border-r border-[var(--line)] p-2">
                      <p className="text-[var(--subtle)]">End</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">
                        {formatTime(activeOffset?.end ?? activeSequence.durationMs)}
                      </p>
                    </div>
                    <div className="p-2">
                      <p className="text-[var(--subtle)]">Paths</p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">
                        {activeSequence.pathIndexes.length}/{icon.paths.length}
                      </p>
                    </div>
                  </div>
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
                      onMouseEnter={() => setHoveredPathIndex(index)}
                      onMouseLeave={() => setHoveredPathIndex(null)}
                      className={`border-b border-r border-[var(--line)] px-3 py-2 text-sm transition-colors ${
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
          ) : (
            <div className="p-5 text-sm text-[var(--muted)]">Create a sequence to begin.</div>
          )}
        </aside>
      </div>
      {deletedSequence && (
        <div className="fixed bottom-5 left-1/2 z-50 flex min-h-11 -translate-x-1/2 items-center gap-4 border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)]">
          <span>{deletedSequence.sequence.name} deleted</span>
          <button
            type="button"
            onClick={undoDelete}
            className="font-semibold text-[var(--accent)] hover:text-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Undo
          </button>
        </div>
      )}
    </main>
  );
}
