import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { IconMeta } from "../../../types/icon";
import Glyph from "./Glyph";

export default function WorkshopHeader({
  icon,
  sequenceCount,
  user,
  profileAvatarUrl,
  profileName,
  onOpenProfile,
}: {
  icon: IconMeta;
  sequenceCount: number;
  user: User | null;
  profileAvatarUrl: string;
  profileName: string;
  onOpenProfile: () => void;
}) {
  return (
    <header className="grid min-h-sp-15 border-b border-[var(--line)] md:grid-cols-[26%_12%_12%_12%_1fr]">
      <div className="flex min-h-sp-15 items-start border-b border-[var(--line)] p-sp-8 md:border-b-0 md:border-r">
        <div>
          <Link href="/" className="flex items-center leading-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/blick-logo.svg" alt="Blick" className="h-sp-6 w-auto" />
            <sup className="ml-sp-3 align-super text-label-xs font-extrabold text-[var(--foreground)]">TM</sup>
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
      <div className="flex items-center justify-between gap-sp-5 p-sp-7 text-label-xs text-[var(--muted)]">
        <div className="min-w-0">
          <p>{icon.library}</p>
          <p className="mt-sp-4 truncate text-[var(--foreground)]">{icon.name}</p>
        </div>
        <button
          type="button"
          onClick={onOpenProfile}
          title={user ? profileName || user.email || "Profile" : "Sign in"}
          aria-label="Open profile"
          className="grid h-sp-11 w-sp-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line-strong)] bg-[var(--control)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {user && profileAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : user ? (
            <span className="text-label-sm font-semibold">
              {(profileName || user.email || "?").slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <Glyph name="user" className="h-sp-6 w-sp-6" />
          )}
        </button>
      </div>
    </header>
  );
}
