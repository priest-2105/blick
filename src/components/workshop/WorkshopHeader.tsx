import Link from "next/link";
import type { IconMeta } from "../../../types/icon";

export default function WorkshopHeader({
  icon,
  sequenceCount,
}: {
  icon: IconMeta;
  sequenceCount: number;
}) {
  return (
    <header className="grid min-h-sp-15 border-b border-[var(--line)] md:grid-cols-[26%_12%_12%_12%_1fr]">
      <div className="flex min-h-sp-15 items-start border-b border-[var(--line)] p-sp-8 md:border-b-0 md:border-r">
        <div>
          <Link href="/" className="text-title-h4 font-extrabold leading-none tracking-normal">
            Blick
            <sup className="ml-sp-3 align-super text-label-xs font-extrabold">TM</sup>
          </Link>
          <p className="mt-sp-5 max-w-48 text-label-xs leading-5 text-[var(--muted)]">
            Animation sequence workshop
          </p>
        </div>
      </div>
      <div className="hidden border-r border-[var(--line)] p-sp-7 md:block">
        <p className="text-subheading-sm font-bold">Icons</p>
        <p className="mt-sp-9 text-label-xs font-bold text-[var(--foreground)]">{icon.paths.length}</p>
      </div>
      <Link href="/" className="hidden border-r border-[var(--line)] p-sp-7 text-[var(--subtle)] md:block">
        <p className="text-subheading-sm font-bold">Browse</p>
      </Link>
      <div className="hidden border-r border-[var(--line)] bg-[var(--active)] p-sp-7 text-[var(--active-ink)] md:block">
        <p className="text-subheading-sm font-bold">Animate</p>
        <p className="mt-sp-9 text-label-xs font-bold">{sequenceCount} seq</p>
      </div>
      <div className="p-sp-7 text-label-xs text-[var(--muted)]">
        <p>{icon.library}</p>
        <p className="mt-sp-4 truncate text-[var(--foreground)]">{icon.name}</p>
      </div>
    </header>
  );
}
