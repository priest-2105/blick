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
    <div className="flex flex-col gap-sp-6">
      <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
        <span className="flex items-center justify-between gap-sp-5">
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
          className="h-sp-4 w-full cursor-pointer accent-[var(--accent)]"
        />
      </label>
      {Object.entries(definition.paramsSchema).map(([key, schema]) => {
        const value = params[key] ?? schema.default;
        if (schema.type === "select") {
          return (
            <label key={key} className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
              {schema.label}
              <select
                value={String(value)}
                onChange={(e) => onParamChange(key, e.target.value)}
                className="min-h-sp-11 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 py-sp-4 text-label-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
            <label key={key} className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
              <span className="flex items-center justify-between gap-sp-5">
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
                className="h-sp-4 w-full cursor-pointer accent-[var(--accent)]"
              />
            </label>
          );
        }
        return null;
      })}
    </div>
  );
}
