"use client";

import type { AnimationDefinition } from "@/lib/animation/types";

export default function ParamControls({
  definition,
  params,
  durationMs,
  onParamChange,
  onDurationChange,
}: {
  definition: AnimationDefinition;
  params: Record<string, unknown>;
  durationMs: number;
  onParamChange: (key: string, value: unknown) => void;
  onDurationChange: (ms: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
        <span className="flex items-center justify-between gap-3">
          Duration
          <span className="font-normal text-[var(--foreground)]">{durationMs}ms</span>
        </span>
        <input
          type="range"
          min={300}
          max={3000}
          step={100}
          value={durationMs}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-[var(--accent)]"
        />
      </label>
      {Object.entries(definition.paramsSchema).map(([key, schema]) => {
        const value = params[key] ?? schema.default;
        if (schema.type === "select") {
          return (
            <label key={key} className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
              {schema.label}
              <select
                value={String(value)}
                onChange={(e) => onParamChange(key, e.target.value)}
                className="min-h-11 border border-[var(--line-strong)] bg-[var(--control)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {schema.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (schema.type === "number") {
          return (
            <label key={key} className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
              <span className="flex items-center justify-between gap-3">
                {schema.label}
                <span className="font-normal text-[var(--foreground)]">{String(value)}</span>
              </span>
              <input
                type="range"
                min={schema.min}
                max={schema.max}
                step={schema.step}
                value={Number(value)}
                onChange={(e) => onParamChange(key, Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
          );
        }
        return null;
      })}
    </div>
  );
}
