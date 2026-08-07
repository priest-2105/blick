"use client";

export default function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={ariaLabel}
      style={{
        background: `linear-gradient(to right, var(--accent) ${pct}%, var(--line-strong) ${pct}%)`,
      }}
      className={`h-sp-3 w-full shrink-0 cursor-pointer appearance-none rounded-full outline-none
        [&::-webkit-slider-thumb]:h-sp-6 [&::-webkit-slider-thumb]:w-sp-6 [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2
        [&::-webkit-slider-thumb]:border-[var(--background)] [&::-webkit-slider-thumb]:bg-[var(--accent)]
        [&::-webkit-slider-thumb]:shadow-[var(--shadow-sm)] [&::-webkit-slider-thumb]:transition-transform
        [&::-webkit-slider-thumb]:hover:scale-110
        [&::-moz-range-thumb]:h-sp-6 [&::-moz-range-thumb]:w-sp-6 [&::-moz-range-thumb]:cursor-pointer
        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
        [&::-moz-range-thumb]:border-[var(--background)] [&::-moz-range-thumb]:bg-[var(--accent)]
        [&::-moz-range-thumb]:shadow-[var(--shadow-sm)]
        [&::-moz-range-track]:h-sp-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
        focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--accent)]
        focus-visible:[&::-webkit-slider-thumb]:ring-offset-2
        ${className}`}
    />
  );
}
