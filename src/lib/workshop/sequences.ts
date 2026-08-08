import type { IconMeta } from "../../../types/icon";
import { animationRegistry, getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { getPrecomputedLength } from "@/lib/animation/path-length";
import type { AnimationDefinition, ProgressStyle } from "@/lib/animation/types";

export type StrokeDirection = "forward" | "backward" | "center-out";
export type PlaybackMode = "loop" | "once";
export type SequenceTrigger = "auto" | "hover-in" | "hover-out";

export interface AnimationSequence {
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

export interface DeletedSequence {
  sequence: AnimationSequence;
  index: number;
  activeSequenceId: string | null;
}

export interface PendingWorkshopDraft {
  projectId?: string | null;
  localDraftId?: string | null;
  name?: string;
  sequences: unknown[];
  activeSequenceId?: string | null;
}

export const HOLD_MS = 700;
export const LOCAL_DRAFT_PREFIX = "blick:workshop-draft:";
export const LAST_LOCAL_DRAFT_KEY = "blick:last-workshop-draft";
export const MAX_SEQUENCE_HISTORY = 60;
export const MAX_LOCAL_DRAFT_BYTES = 500_000;
export const MAX_LOCAL_DRAFT_SEQUENCES = 100;
export const MAX_ICON_PATHS = 1_000;
export const MAX_TEXT_LENGTH = 160;
export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
export const AVATAR_BUCKET = "avatars";

export interface LocalWorkshopDraft {
  id: string;
  projectId?: string | null;
  name: string;
  icon: IconMeta;
  color: string;
  sequences: AnimationSequence[];
  activeSequenceId: string | null;
  updatedAt: string;
}

export interface SequenceHistory {
  past: AnimationSequence[][];
  present: AnimationSequence[];
  future: AnimationSequence[][];
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function defaultParams(definition: AnimationDefinition | undefined) {
  if (!definition) return {};
  return Object.fromEntries(
    Object.entries(definition.paramsSchema).map(([key, schema]) => [key, schema.default]),
  );
}

export function createSequence({
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

export function createDefaultSequences(icon: IconMeta) {
  return [
    createSequence({
      id: "sequence-1",
      index: 0,
      icon,
      pathIndexes: icon.paths.map((_, index) => index),
    }),
  ];
}

export function isAnimationSequence(value: unknown): value is AnimationSequence {
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

export function createInitialSequences(icon: IconMeta, draft: PendingWorkshopDraft | null) {
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

export function nextSequenceNumber(sequences: AnimationSequence[]) {
  return (
    sequences.reduce((max, sequence) => {
      const match = /^sequence-(\d+)$/.exec(sequence.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1
  );
}

export function createDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function localDraftKey(id: string) {
  return `${LOCAL_DRAFT_PREFIX}${id}`;
}

export function getDraftIdFromPath(pathname: string) {
  const match = /^\/workshop\/([^/?#]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function readLocalDraft(id: string): LocalWorkshopDraft | null {
  try {
    const raw = window.localStorage.getItem(localDraftKey(id));
    if (!raw) return null;
    if (raw.length > MAX_LOCAL_DRAFT_BYTES) return null;
    const parsed = JSON.parse(raw) as Partial<LocalWorkshopDraft>;
    if (
      !parsed.icon ||
      typeof parsed.icon.name !== "string" ||
      parsed.icon.name.length > MAX_TEXT_LENGTH ||
      typeof parsed.icon.viewBox !== "string" ||
      parsed.icon.viewBox.length > MAX_TEXT_LENGTH ||
      !Array.isArray(parsed.icon.paths) ||
      parsed.icon.paths.length > MAX_ICON_PATHS ||
      !Array.isArray(parsed.sequences) ||
      parsed.sequences.length > MAX_LOCAL_DRAFT_SEQUENCES
    ) {
      return null;
    }

    const sequences = parsed.sequences.filter(isAnimationSequence);
    if (sequences.some((sequence) => sequence.name.length > MAX_TEXT_LENGTH)) return null;

    return {
      id,
      projectId: parsed.projectId ?? null,
      name:
        typeof parsed.name === "string" && parsed.name.length <= MAX_TEXT_LENGTH
          ? parsed.name
          : parsed.icon.name,
      icon: parsed.icon,
      color: parsed.color ?? "#ffffff",
      sequences,
      activeSequenceId:
        typeof parsed.activeSequenceId === "string" ? parsed.activeSequenceId : null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeLocalDraft(draft: LocalWorkshopDraft) {
  window.localStorage.setItem(localDraftKey(draft.id), JSON.stringify(draft));
  window.localStorage.setItem(LAST_LOCAL_DRAFT_KEY, draft.id);
}

export function readLastLocalDraftId() {
  try {
    return window.localStorage.getItem(LAST_LOCAL_DRAFT_KEY);
  } catch {
    return null;
  }
}

export function pushSequenceHistory(
  history: SequenceHistory,
  next: AnimationSequence[] | ((current: AnimationSequence[]) => AnimationSequence[]),
) {
  const nextPresent = typeof next === "function" ? next(history.present) : next;
  if (nextPresent === history.present) return history;

  return {
    past: [...history.past, history.present].slice(-MAX_SEQUENCE_HISTORY),
    present: nextPresent,
    future: [],
  };
}

/** Minimal shape needed for timeline math, so callers outside the workshop
 * (e.g. the export preview, working with `ExportSequence`) can reuse this
 * logic without duplicating it or depending on the full `AnimationSequence`. */
export interface TimedSequence {
  id: string;
  delayMs: number;
  durationMs: number;
}

export function sequenceEnd(sequence: TimedSequence) {
  return sequence.delayMs + sequence.durationMs;
}

export function timelineDuration(sequences: TimedSequence[]) {
  return sequences.reduce((total, sequence) => total + sequenceEnd(sequence), 0);
}

export function sequenceOffsets(sequences: TimedSequence[]) {
  return sequences.reduce<Array<{ id: string; start: number; end: number }>>((offsets, sequence) => {
    const previousEnd = offsets.at(-1)?.end ?? 0;
    const start = previousEnd + sequence.delayMs;
    const end = start + sequence.durationMs;
    return [...offsets, { id: sequence.id, start, end }];
  }, []);
}

export function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function triggerLabel(trigger: SequenceTrigger) {
  if (trigger === "hover-in") return "Hover";
  if (trigger === "hover-out") return "Leave";
  return "Auto";
}

export function drawStrokeStyle({
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

export function applyElementStyle(node: SVGPathElement, style: ProgressStyle["elements"][number]) {
  node.style.opacity = style.opacity !== undefined ? `${style.opacity}` : "1";
  node.style.strokeDasharray = style.strokeDasharray ?? "";
  node.style.strokeDashoffset =
    style.strokeDashoffset !== undefined ? `${style.strokeDashoffset}` : "";
  node.style.transform = style.transform ?? "";
}
