"use client";

export type Technique = "all" | "stroke" | "filled";

const OPTIONS: Array<{ id: Technique; label: string }> = [
  { id: "all", label: "All" },
  { id: "stroke", label: "Line" },
  { id: "filled", label: "Filled" },
];

export default function TechniqueFilter({
  value,
  onChange,
}: {
  value: Technique;
  onChange: (value: Technique) => void;
}) {
  return (
    <div className="grid grid-cols-3 border border-[var(--line)]">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`border-r border-[var(--line)] px-sp-5 py-sp-4 text-label-xs font-bold transition-colors last:border-r-0 ${
            value === opt.id
              ? "bg-[var(--active)] text-[var(--active-ink)]"
              : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
