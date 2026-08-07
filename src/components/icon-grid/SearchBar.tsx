"use client";

export default function SearchBar({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <svg
        className="pointer-events-none absolute left-0 top-1/2 h-sp-6 w-sp-6 -translate-y-1/2 text-[var(--muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search icons..."
        className="h-sp-9 w-full border-0 bg-transparent py-0 pl-sp-8 pr-sp-4 text-label-sm font-medium text-[var(--foreground)] placeholder:text-[var(--subtle)] focus:outline-none"
      />
    </div>
  );
}
