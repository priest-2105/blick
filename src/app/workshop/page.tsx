"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Reorder, useAnimationFrame, useDragControls } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IconMeta } from "../../../types/icon";
import { animationRegistry, getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { getPrecomputedLength } from "@/lib/animation/path-length";
import type { AnimationDefinition, ProgressStyle } from "@/lib/animation/types";
import ExportActions from "@/components/export/ExportActions";
import { useProjectStore } from "@/lib/state/project-store";
import ParamControls from "@/components/detail/ParamControls";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listSavedProjects, saveProject, type SavedProject } from "@/lib/supabase/projects";

type StrokeDirection = "forward" | "backward" | "center-out";
type PlaybackMode = "loop" | "once";
type SequenceTrigger = "auto" | "hover-in" | "hover-out";

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
  trigger: SequenceTrigger;
}

interface DeletedSequence {
  sequence: AnimationSequence;
  index: number;
  activeSequenceId: string | null;
}

interface PendingWorkshopDraft {
  projectId?: string | null;
  name?: string;
  sequences: unknown[];
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
    trigger: "auto",
  };
}

function createDefaultSequences(icon: IconMeta) {
  return [
    createSequence({
      id: "sequence-1",
      index: 0,
      icon,
      pathIndexes: icon.paths.map((_, index) => index),
    }),
  ];
}

function isAnimationSequence(value: unknown): value is AnimationSequence {
  if (!value || typeof value !== "object") return false;
  const sequence = value as Partial<AnimationSequence>;
  return (
    typeof sequence.id === "string" &&
    typeof sequence.name === "string" &&
    Array.isArray(sequence.pathIndexes) &&
    sequence.pathIndexes.every((index) => Number.isInteger(index)) &&
    typeof sequence.animationId === "string" &&
    typeof sequence.params === "object" &&
    typeof sequence.durationMs === "number" &&
    typeof sequence.delayMs === "number" &&
    typeof sequence.direction === "string" &&
    typeof sequence.reverse === "boolean" &&
    typeof sequence.trigger === "string"
  );
}

function createInitialSequences(icon: IconMeta, draft: PendingWorkshopDraft | null) {
  const saved = draft?.sequences;
  if (!Array.isArray(saved)) return createDefaultSequences(icon);

  const sequences = saved.filter(isAnimationSequence).map((sequence, index) => ({
    ...sequence,
    id: sequence.id || `sequence-${index + 1}`,
    name: sequence.name || `Sequence ${index + 1}`,
    pathIndexes: sequence.pathIndexes.filter((pathIndex) => pathIndex >= 0 && pathIndex < icon.paths.length),
    animationId: getAnimation(sequence.animationId)?.id ?? createSequence({
      id: `sequence-${index + 1}`,
      index,
      icon,
      pathIndexes: [],
    }).animationId,
    params: sequence.params ?? {},
    durationMs: Math.max(16, sequence.durationMs),
    delayMs: Math.max(0, sequence.delayMs),
  }));

  return sequences.length > 0 ? sequences : createDefaultSequences(icon);
}

function nextSequenceNumber(sequences: AnimationSequence[]) {
  return (
    sequences.reduce((max, sequence) => {
      const match = /^sequence-(\d+)$/.exec(sequence.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1
  );
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

function triggerLabel(trigger: SequenceTrigger) {
  if (trigger === "hover-in") return "Hover";
  if (trigger === "hover-out") return "Leave";
  return "Auto";
}

function Glyph({
  name,
  className = "h-4 w-4",
}: {
  name:
    | "play"
    | "pause"
    | "reset"
    | "loop"
    | "once"
    | "copy"
    | "trash"
    | "auto"
    | "hover"
    | "leave"
    | "forward"
    | "backward"
    | "center"
    | "reverse";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "play") return <svg {...common}><path d="M8 5v14l11-7z" /></svg>;
  if (name === "pause") return <svg {...common}><path d="M8 5v14" /><path d="M16 5v14" /></svg>;
  if (name === "reset") return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" /></svg>;
  if (name === "loop") return <svg {...common}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  if (name === "once") return <svg {...common}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
  if (name === "copy") return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M4 16V5a1 1 0 0 1 1-1h11" /></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></svg>;
  if (name === "auto") return <svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
  if (name === "hover") return <svg {...common}><path d="M9 4v9l-2-2a2 2 0 0 0-3 3l5 6h7l3-7" /><path d="M13 4v8" /></svg>;
  if (name === "leave") return <svg {...common}><path d="M9 4v9l-2-2a2 2 0 0 0-3 3l5 6h7l3-7" /><path d="M15 5l4 4-4 4" /></svg>;
  if (name === "forward") return <svg {...common}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
  if (name === "backward") return <svg {...common}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>;
  if (name === "center") return <svg {...common}><path d="M4 12h6" /><path d="M14 12h6" /><path d="M10 8l4 4-4 4" /><path d="M14 8l-4 4 4 4" /></svg>;
  if (name === "reverse") return <svg {...common}><path d="M7 7h10v4" /><path d="M17 17H7v-4" /><path d="M17 7l-4-4" /><path d="M7 17l4 4" /></svg>;
  return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}

function IconButton({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: Parameters<typeof Glyph>[0]["name"];
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid min-h-9 min-w-9 place-items-center border border-[var(--line-strong)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-[var(--active)] text-[var(--active-ink)]"
          : "bg-[var(--control)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
    >
      <Glyph name={icon} />
    </button>
  );
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
      if (node) {
        const currentOpacity = Number(node.style.opacity || 0);
        node.style.opacity = `${Math.max(currentOpacity, 0.34)}`;
        node.style.filter =
          "drop-shadow(0 0 6px color-mix(in oklch, var(--accent) 72%, transparent))";
      }
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
              <span
                className="inline-flex shrink-0 items-center gap-1 text-[10px]"
                title={`Trigger: ${triggerLabel(sequence.trigger)}`}
              >
                <Glyph name={triggerIcon} className="h-3 w-3" />
                {formatTime(offset?.start ?? 0)}
              </span>
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
              title={`Duplicate ${sequence.name}`}
              aria-label={`Duplicate ${sequence.name}`}
              onClick={onDuplicate}
              className="grid min-h-8 place-items-center border-r border-current/15 transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
            >
              <Glyph name="copy" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={`Delete ${sequence.name}`}
              aria-label={`Delete ${sequence.name}`}
              onClick={onDelete}
              disabled={!canDelete}
              className="grid min-h-8 place-items-center transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Glyph name="trash" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

export default function WorkshopPage() {
  const { icon, color, workshopDraft, clearWorkshopDraft } = useProjectStore();

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

  return (
    <WorkshopEditor
      key={`${icon.library}-${icon.name}-${icon.paths.length}`}
      icon={icon}
      color={color}
      pendingDraft={
        workshopDraft
          ? {
              projectId: workshopDraft.projectId,
              name: workshopDraft.name,
              sequences: workshopDraft.sequences,
            }
          : null
      }
      onDraftConsumed={clearWorkshopDraft}
    />
  );
}

function WorkshopEditor({
  icon,
  color,
  pendingDraft,
  onDraftConsumed,
}: {
  icon: IconMeta;
  color: string;
  pendingDraft: PendingWorkshopDraft | null;
  onDraftConsumed: () => void;
}) {
  const initialSequences = useMemo(() => createInitialSequences(icon, pendingDraft), [icon, pendingDraft]);
  const [sequences, setSequences] = useState<AnimationSequence[]>(() => initialSequences);
  const nextSequenceIdRef = useRef(nextSequenceNumber(initialSequences));
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(() => sequences[0]?.id ?? null);
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("loop");
  const [playheadMs, setPlayheadMs] = useState(0);
  const [deletedSequence, setDeletedSequence] = useState<DeletedSequence | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [projectName, setProjectName] = useState(pendingDraft?.name ?? icon.name);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(pendingDraft?.projectId ?? null);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const loadWorkshopDraft = useProjectStore((state) => state.loadWorkshopDraft);

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
    if (pendingDraft) onDraftConsumed();
  }, [onDraftConsumed, pendingDraft]);

  useEffect(() => {
    if (!deletedSequence) return;
    const timeout = window.setTimeout(() => setDeletedSequence(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [deletedSequence]);

  const refreshProjects = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProjects([]);
      return;
    }
    setIsRefreshing(true);
    const result = await listSavedProjects();
    setProjects(result.projects);
    setProjectMessage(result.error);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      const nextUser = data.user ?? null;
      setUser(nextUser);
      void refreshProjects(nextUser);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void refreshProjects(nextUser);
    });

    return () => subscription.unsubscribe();
  }, [refreshProjects, supabase]);

  const sendSignInLink = async () => {
    if (!supabase) {
      setAuthMessage("Add Supabase env vars to enable cloud saves.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthMessage("Enter an email address.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/workshop`,
      },
    });
    setAuthMessage(error ? error.message : "Check your email for the sign-in link.");
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProjects([]);
    setCurrentProjectId(null);
    setProjectMessage(null);
  };

  const handleSaveProject = async () => {
    if (!user) {
      setShowSavePanel(true);
      setAuthMessage("Sign in to save this project.");
      return;
    }

    setShowSavePanel(true);
    setIsSaving(true);
    const result = await saveProject({
      id: currentProjectId,
      user,
      name: projectName,
      icon,
      color,
      sequences,
    });
    setIsSaving(false);

    if (result.error) {
      setProjectMessage(result.error);
      return;
    }

    if (result.project) {
      setCurrentProjectId(result.project.id);
      setProjectName(result.project.name);
      setProjectMessage("Saved.");
      await refreshProjects(user);
    }
  };

  const loadSavedProject = (project: SavedProject) => {
    loadWorkshopDraft({
      projectId: project.id,
      name: project.name,
      icon: project.icon_data,
      color: project.color,
      sequences: project.sequences,
    });
  };

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
      <header className="grid min-h-32 border-b border-[var(--line)] md:grid-cols-[26%_12%_12%_12%_1fr]">
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
        <div className="p-5 text-xs text-[var(--muted)]">
          <p>{icon.library}</p>
          <p className="mt-2 truncate text-[var(--foreground)]">{icon.name}</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)_390px]">
        <aside className="flex min-h-0 flex-col border-b border-[var(--line)] bg-[var(--surface)] md:border-b-0 md:border-r">
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
                  isActive={activeSequence?.id === sequence.id}
                  canDelete={sequences.length > 1}
                  onSelect={() => setActiveSequenceId(sequence.id)}
                  onDuplicate={() => duplicateSequence(sequence)}
                  onDelete={() => removeSequence(sequence.id)}
                />
              );
            })}
          </Reorder.Group>
          <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] p-4">
            <ExportActions payload={exportPayload} label="Export animation" fullWidth />
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
              <IconButton
                label={isPlaying ? "Pause preview" : "Play preview"}
                icon={isPlaying ? "pause" : "play"}
                active
                onClick={() => setIsPlaying((current) => !current)}
              />
              <IconButton
                label="Reset preview"
                icon="reset"
                onClick={() => {
                  setIsPlaying(false);
                  setPlayheadMs(0);
                }}
              />
              <div className="flex border border-[var(--line-strong)]">
                <button
                  type="button"
                  title="Loop preview"
                  aria-label="Loop preview"
                  onClick={() => setPlaybackMode("loop")}
                  className={`grid min-h-9 min-w-9 place-items-center ${
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
                  onClick={() => setPlaybackMode("once")}
                  className={`grid min-h-9 min-w-9 place-items-center border-l border-[var(--line-strong)] ${
                    playbackMode === "once"
                      ? "bg-[var(--active)] text-[var(--active-ink)]"
                      : "bg-[var(--control)] text-[var(--foreground)] hover:text-[var(--accent)]"
                  }`}
                >
                  <Glyph name="once" />
                </button>
              </div>
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
          {showSavePanel || user ? (
          <div className="border-b border-[var(--line)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Cloud saves</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {supabase
                    ? user
                      ? user.email
                      : "Sign in with email"
                    : "Supabase not configured"}
                </p>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={signOut}
                  className="min-h-8 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  Sign out
                </button>
              )}
            </div>

            {!user ? (
              <div className="mt-4 grid gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={sendSignInLink}
                  disabled={!supabase}
                  className="min-h-10 bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send sign-in link
                </button>
                {authMessage && <p className="text-xs text-[var(--muted)]">{authMessage}</p>}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
                  Project name
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={isSaving}
                    className="min-h-10 bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : currentProjectId ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshProjects(user)}
                    disabled={isRefreshing}
                    className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
                {projectMessage && <p className="text-xs text-[var(--muted)]">{projectMessage}</p>}
                <div className="border border-[var(--line)]">
                  <div className="border-b border-[var(--line)] p-3 text-xs font-semibold text-[var(--muted)]">
                    Recent projects
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {projects.length === 0 ? (
                      <p className="p-3 text-xs text-[var(--subtle)]">No saved projects yet.</p>
                    ) : (
                      projects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => loadSavedProject(project)}
                          className={`block w-full border-b border-[var(--line)] p-3 text-left text-xs transition-colors last:border-b-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)] ${
                            currentProjectId === project.id
                              ? "bg-[var(--active)] text-[var(--active-ink)]"
                              : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <span className="block truncate font-semibold">{project.name}</span>
                          <span className="mt-1 block truncate opacity-80">
                            {project.icon_library} / {project.icon_name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="border-b border-[var(--line)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Project</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">Save this workshop when you want it kept.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveProject}
                  className="min-h-10 bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
                >
                  Save design
                </button>
              </div>
            </div>
          )}
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
                  <IconButton
                    label={`Delete ${activeSequence.name}`}
                    icon="trash"
                    onClick={() => removeSequence(activeSequence.id)}
                  />
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

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium text-[var(--muted)]">
                  <span>Trigger</span>
                  <span className="text-xs text-[var(--foreground)]">
                    {triggerLabel(activeSequence.trigger)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["auto", "auto", "Auto timeline"],
                    ["hover-in", "hover", "Run when target is hovered"],
                    ["hover-out", "leave", "Run when hover leaves target"],
                  ].map(([value, iconName, label]) => (
                    <IconButton
                      key={value}
                      label={label}
                      icon={iconName as Parameters<typeof Glyph>[0]["name"]}
                      active={activeSequence.trigger === value}
                      onClick={() =>
                        updateSequence(activeSequence.id, { trigger: value as SequenceTrigger })
                      }
                    />
                  ))}
                </div>
              </div>

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
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-[var(--muted)]">
                    <span>Direction</span>
                    <span className="text-xs text-[var(--foreground)]">{activeSequence.direction}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["forward", "forward", "Draw forward"],
                      ["backward", "backward", "Draw backward"],
                      ["center-out", "center", "Draw from center outward"],
                    ].map(([value, iconName, label]) => (
                      <IconButton
                        key={value}
                        label={label}
                        icon={iconName as Parameters<typeof Glyph>[0]["name"]}
                        active={activeSequence.direction === value}
                        onClick={() =>
                          updateSequence(activeSequence.id, { direction: value as StrokeDirection })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--background)] p-3">
                <span className="text-sm font-medium text-[var(--muted)]">Reverse</span>
                <IconButton
                  label="Reverse sequence"
                  icon="reverse"
                  active={activeSequence.reverse}
                  onClick={() =>
                    updateSequence(activeSequence.id, { reverse: !activeSequence.reverse })
                  }
                />
              </div>

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
