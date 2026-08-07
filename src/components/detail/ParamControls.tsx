"use client";

import type { AnimationDefinition } from "@/lib/animation/types";
import RangeSlider from "@/components/ui/RangeSlider";
import Select from "@/components/ui/Select";

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
        <RangeSlider
          min={300}
          max={3000}
          step={100}
          value={durationMs}
          onChange={onDurationChange}
          ariaLabel="Duration"
        />
      </label>
      {Object.entries(definition.paramsSchema).map(([key, schema]) => {
        const value = params[key] ?? schema.default;
        if (schema.type === "select") {
          return (
            <label key={key} className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
              {schema.label}
              <Select
                value={String(value)}
                onChange={(next) => onParamChange(key, next)}
                ariaLabel={schema.label}
              >
                {schema.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
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
              <RangeSlider
                min={schema.min ?? 0}
                max={schema.max ?? 100}
                step={schema.step}
                value={Number(value)}
                onChange={(next) => onParamChange(key, next)}
                ariaLabel={schema.label}
              />
            </label>
          );
        }
        return null;
      })}
    </div>
  );
}
