"use client";

import type { User } from "@supabase/supabase-js";

export default function AccountModal({
  user,
  onClose,
  accountTab,
  onAccountTabChange,
  email,
  onEmailChange,
  authMessage,
  isSendingLink,
  onSendSignInLink,
  supabaseConfigured,
  profileName,
  onProfileNameChange,
  projectName,
  onProjectNameChange,
  onUploadAvatar,
  isUploadingAvatar,
  onUpdateProfile,
  isUpdatingProfile,
  profileMessage,
  onSignOut,
  onDeleteAccount,
  isDeletingAccount,
}: {
  user: User | null;
  onClose: () => void;
  accountTab: "profile" | "session";
  onAccountTabChange: (tab: "profile" | "session") => void;
  email: string;
  onEmailChange: (value: string) => void;
  authMessage: string | null;
  isSendingLink: boolean;
  onSendSignInLink: () => void;
  supabaseConfigured: boolean;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onUploadAvatar: (file: File | undefined) => void;
  isUploadingAvatar: boolean;
  onUpdateProfile: () => void;
  isUpdatingProfile: boolean;
  profileMessage: string | null;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-sp-6">
      <section className="w-full max-w-lg border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]">
        <div className="flex items-start justify-between gap-sp-6 border-b border-[var(--line)] p-sp-7">
          <div>
            <h2 className="text-label-lg font-semibold">{user ? "Account" : "Sign in"}</h2>
            <p className="mt-sp-3 text-label-xs text-[var(--muted)]">
              {user ? "Profile and session settings." : "Save this workshop after signing in."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative grid h-sp-10 w-sp-10 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Close account"
          >
            <span className="absolute h-sp-1 w-sp-6 rotate-45 bg-current" />
            <span className="absolute h-sp-1 w-sp-6 -rotate-45 bg-current" />
          </button>
        </div>

        {user && (
          <div className="grid grid-cols-2 border-b border-[var(--line)] text-label-xs font-semibold">
            <button
              type="button"
              onClick={() => onAccountTabChange("profile")}
              className={`min-h-sp-10 ${accountTab === "profile" ? "bg-[var(--active)] text-[var(--active-ink)]" : "bg-[var(--control)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => onAccountTabChange("session")}
              className={`min-h-sp-10 border-l border-[var(--line)] ${accountTab === "session" ? "bg-[var(--active)] text-[var(--active-ink)]" : "bg-[var(--control)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Session
            </button>
          </div>
        )}

        <div className="space-y-sp-6 p-sp-7">
          {!user ? (
            <>
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@example.com"
                className="min-h-sp-10 w-full rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button
                type="button"
                onClick={onSendSignInLink}
                disabled={!supabaseConfigured || isSendingLink}
                className="min-h-sp-10 w-full rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSendingLink ? "Sending sign-in link..." : "Send sign-in link"}
              </button>
              {authMessage && <p className="text-label-xs text-[var(--muted)]">{authMessage}</p>}
            </>
          ) : accountTab === "profile" ? (
            <>
              <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
                Display name
                <input
                  value={profileName}
                  onChange={(event) => onProfileNameChange(event.target.value)}
                  placeholder="Display name"
                  className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>
              <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
                Project name
                <input
                  value={projectName}
                  onChange={(event) => onProjectNameChange(event.target.value)}
                  placeholder="Project name"
                  className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>
              <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
                Avatar image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadAvatar(event.target.files?.[0])}
                  className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 py-sp-4 text-label-sm text-[var(--foreground)] file:mr-sp-5 file:rounded-sm file:border-0 file:bg-[var(--accent)] file:px-sp-5 file:py-sp-3 file:text-label-xs file:font-semibold file:text-[var(--active-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <span className="text-label-xs text-[var(--subtle)]">
                  {isUploadingAvatar ? "Uploading..." : "PNG, JPG, GIF, or WebP. Max 4 MB."}
                </span>
              </label>
              <button
                type="button"
                onClick={onUpdateProfile}
                disabled={isUpdatingProfile || isUploadingAvatar}
                className="min-h-sp-10 w-full rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdatingProfile ? "Updating profile..." : "Save profile"}
              </button>
              {profileMessage && <p className="text-label-xs text-[var(--muted)]">{profileMessage}</p>}
            </>
          ) : (
            <>
              <div className="border border-[var(--line)] bg-[var(--background)] p-sp-5 text-label-sm">
                <p className="font-semibold text-[var(--foreground)]">{user.email}</p>
                <p className="mt-sp-3 text-label-xs text-[var(--muted)]">Signed in to Blick cloud saves.</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-sp-10 w-full rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={isDeletingAccount}
                className="min-h-sp-10 w-full rounded-sm border border-[var(--color-red-300)] bg-[var(--color-red-50)] px-sp-5 text-label-sm font-semibold text-[var(--color-red-600)] hover:bg-[var(--color-red-100)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingAccount ? "Deleting account..." : "Delete account"}
              </button>
              {profileMessage && <p className="text-label-xs text-[var(--muted)]">{profileMessage}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
