"use client";

import type { User } from "@supabase/supabase-js";

export default function WorkshopSavePanel({
  showSavePanel,
  user,
  supabaseConfigured,
  authMessage,
  profileAvatarUrl,
  profileName,
  projectName,
  onProjectNameChange,
  onSave,
  isSaving,
  currentProjectId,
  onRefresh,
  isRefreshing,
  projectMessage,
  projectCount,
  onOpenProjects,
  onOpenAccount,
  onSignOut,
}: {
  showSavePanel: boolean;
  user: User | null;
  supabaseConfigured: boolean;
  authMessage: string | null;
  profileAvatarUrl: string;
  profileName: string;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  currentProjectId: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  projectMessage: string | null;
  projectCount: number;
  onOpenProjects: () => void;
  onOpenAccount: () => void;
  onSignOut: () => void;
}) {
  if (!showSavePanel && !user) {
    return (
      <div className="border-b border-[var(--line)] p-sp-7">
        <div className="flex items-center justify-between gap-sp-6">
          <div>
            <h2 className="text-label-lg font-semibold">Project</h2>
            <p className="mt-sp-3 text-label-xs text-[var(--muted)]">Save this workshop when you want it kept.</p>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
          >
            Save design
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--line)] p-sp-7">
      <div className="flex items-start justify-between gap-sp-5">
        <div>
          <h2 className="text-label-lg font-semibold">Cloud saves</h2>
          <p className="mt-sp-3 text-label-xs text-[var(--muted)]">
            {supabaseConfigured ? (user ? user.email : "Sign in with email") : "Supabase not configured"}
          </p>
        </div>
        {user && (
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-sp-9 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Sign out
          </button>
        )}
      </div>

      {!user ? (
        <div className="mt-sp-6 grid gap-sp-4">
          <button
            type="button"
            onClick={onOpenAccount}
            className="min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
          >
            Sign in to save
          </button>
          {authMessage && <p className="text-label-xs text-[var(--muted)]">{authMessage}</p>}
        </div>
      ) : (
        <div className="mt-sp-6 space-y-sp-6">
          <button
            type="button"
            onClick={onOpenAccount}
            className="w-full border border-[var(--line)] bg-[var(--background)] p-sp-5 text-left transition-colors hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <div className="flex items-center gap-sp-5">
              <div className="grid h-sp-10 w-sp-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line-strong)] bg-[var(--control)] text-label-sm font-semibold text-[var(--foreground)]">
                {profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profileName || user.email || "?").slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-label-sm font-semibold text-[var(--foreground)]">
                  {profileName || "Unnamed user"}
                </p>
                <p className="truncate text-label-xs text-[var(--muted)]">{user.email}</p>
              </div>
            </div>
          </button>
          <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
            Project name
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-sp-4">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : currentProjectId ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {projectMessage && <p className="text-label-xs text-[var(--muted)]">{projectMessage}</p>}
          <button
            type="button"
            onClick={onOpenProjects}
            className="min-h-sp-10 w-full rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Past sequences ({projectCount})
          </button>
        </div>
      )}
    </div>
  );
}
