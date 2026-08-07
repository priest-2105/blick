"use client";

import type { ReactNode } from "react";

export default function Select({
  value,
  onChange,
  ariaLabel,
  className = "",
  children,
}: {
  value: string | number;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={`min-h-sp-10 w-full appearance-none rounded-sm border border-[var(--line-strong)] bg-[var(--control)] py-sp-4 pl-sp-5 pr-sp-9 text-label-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${className}`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-sp-4 top-1/2 h-sp-5 w-sp-5 -translate-y-1/2 text-[var(--muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
