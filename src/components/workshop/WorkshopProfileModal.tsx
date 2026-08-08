"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { SavedProject } from "@/lib/supabase/projects";
import Glyph, { type GlyphName } from "./Glyph";

export type ProfileModalTab = "profile" | "cloud" | "session";

const TABS: { id: ProfileModalTab; label: string; icon: GlyphName }[] = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "cloud", label: "Cloud saves", icon: "cloud" },
  { id: "session", label: "Session", icon: "shield" },
];

export default function WorkshopProfileModal({
  onClose,
  activeTab,
  onTabChange,
  user,
  supabaseConfigured,
  email,
  onEmailChange,
  authMessage,
  isSendingLink,
  onSendSignInLink,
  profileAvatarUrl,
  profileName,
  onProfileNameChange,
  projectName,
  onProjectNameChange,
  onUploadAvatar,
  isUploadingAvatar,
  onUpdateProfile,
  isUpdatingProfile,
  profileMessage,
  saveStatus,
  saveMessage,
  onSaveNow,
  currentProjectId,
  projects,
  onSelectProject,
  onRefreshProjects,
  isRefreshingProjects,
  onSignOut,
  onDeleteAccount,
  isDeletingAccount,
}: {
  onClose: () => void;
  activeTab: ProfileModalTab;
  onTabChange: (tab: ProfileModalTab) => void;
  user: User | null;
  supabaseConfigured: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  authMessage: string | null;
  isSendingLink: boolean;
  onSendSignInLink: () => void;
  profileAvatarUrl: string;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onUploadAvatar: (file: File | undefined) => void;
  isUploadingAvatar: boolean;
  onUpdateProfile: () => void;
  isUpdatingProfile: boolean;
  profileMessage: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveMessage: string | null;
  onSaveNow: () => void;
  currentProjectId: string | null;
  projects: SavedProject[];
  onSelectProject: (project: SavedProject) => void;
  onRefreshProjects: () => void;
  isRefreshingProjects: boolean;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const saveStatusLabel =
    saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : "Not saved yet";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-sp-6 backdrop-blur-md"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="flex h-[600px] max-h-[86vh] w-full max-w-3xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]"
      >
        <nav className="flex w-48 shrink-0 flex-col gap-sp-2 border-r border-[var(--line)] bg-[var(--background)] p-sp-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="relative min-h-sp-10 rounded-sm text-left text-label-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {activeTab === tab.id && (
                <motion.span
                  layoutId="workshop-tab-highlight"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="absolute inset-0 rounded-sm bg-[var(--active)]"
                />
              )}
              <span
                className={`relative flex items-center gap-sp-4 px-sp-5 py-sp-4 ${
                  activeTab === tab.id
                    ? "text-[var(--active-ink)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Glyph name={tab.icon} className="h-sp-6 w-sp-6 shrink-0" />
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-sp-6 border-b border-[var(--line)] p-sp-7">
            <div>
              <h2 className="text-label-lg font-semibold">
                {TABS.find((tab) => tab.id === activeTab)?.label}
              </h2>
              <p className="mt-sp-3 text-label-xs text-[var(--muted)]">
                {activeTab === "profile"
                  ? "Display name, avatar, and project title."
                  : activeTab === "cloud"
                    ? supabaseConfigured
                      ? user
                        ? "Autosaves to your account as you edit."
                        : "Sign in with email to enable autosave."
                      : "Supabase not configured"
                    : "Manage your session and account."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-sp-10 w-sp-10 shrink-0 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Close"
            >
              <Glyph name="close" className="h-sp-5 w-sp-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-sp-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {activeTab === "profile" && (
                  <div className="space-y-sp-6">
                    <label className="flex flex-col gap-sp-4 text-label-sm font-medium text-[var(--muted)]">
                      Display name
                      <input
                        value={profileName}
                        onChange={(event) => onProfileNameChange(event.target.value)}
                        placeholder="Display name"
                        disabled={!user}
                        className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
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
                        disabled={!user}
                        onChange={(event) => onUploadAvatar(event.target.files?.[0])}
                        className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 py-sp-4 text-label-sm text-[var(--foreground)] file:mr-sp-5 file:rounded-sm file:border-0 file:bg-[var(--accent)] file:px-sp-5 file:py-sp-3 file:text-label-xs file:font-semibold file:text-[var(--active-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="text-label-xs text-[var(--subtle)]">
                        {isUploadingAvatar ? "Uploading..." : "PNG, JPG, GIF, or WebP. Max 4 MB."}
                      </span>
                    </label>
                    {profileAvatarUrl && (
                      <div className="flex items-center gap-sp-5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={profileAvatarUrl}
                          alt=""
                          className="h-sp-11 w-sp-11 rounded-full border border-[var(--line-strong)] object-cover"
                        />
                        <span className="text-label-xs text-[var(--muted)]">Current avatar</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onUpdateProfile}
                      disabled={!user || isUpdatingProfile || isUploadingAvatar}
                      className="min-h-sp-10 w-full rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {!user ? "Sign in to edit profile" : isUpdatingProfile ? "Saving profile..." : "Save profile"}
                    </button>
                    {profileMessage && <p className="text-label-xs text-[var(--muted)]">{profileMessage}</p>}
                  </div>
                )}

                {activeTab === "cloud" && (
                  <div className="space-y-sp-6">
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
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-sp-5 border border-[var(--line)] bg-[var(--background)] p-sp-5">
                          <div>
                            <p className="text-label-sm font-semibold text-[var(--foreground)]">
                              {saveStatusLabel}
                            </p>
                            <p className="mt-sp-2 text-label-xs text-[var(--muted)]">
                              {currentProjectId ? "Synced to your account." : "Not saved to your account yet."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={onSaveNow}
                            disabled={saveStatus === "saving"}
                            className="min-h-sp-9 shrink-0 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save now
                          </button>
                        </div>
                        {saveStatus === "error" && saveMessage && (
                          <p className="text-label-xs text-[var(--color-red-600)]">{saveMessage}</p>
                        )}

                        <div className="flex items-center justify-between gap-sp-5">
                          <h3 className="text-label-sm font-semibold">Past sequences ({projects.length})</h3>
                          <button
                            type="button"
                            onClick={onRefreshProjects}
                            disabled={isRefreshingProjects}
                            className="min-h-sp-9 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isRefreshingProjects ? "Refreshing..." : "Refresh"}
                          </button>
                        </div>

                        {projects.length === 0 ? (
                          <div className="border border-[var(--line)] bg-[var(--background)] p-sp-7 text-label-sm text-[var(--muted)]">
                            No saved sequences yet.
                          </div>
                        ) : (
                          <div className="grid gap-sp-4 sm:grid-cols-2">
                            {projects.map((project) => (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => onSelectProject(project)}
                                className={`min-h-sp-14 border p-sp-5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                                  currentProjectId === project.id
                                    ? "border-[var(--accent)] bg-[var(--active)] text-[var(--active-ink)]"
                                    : "border-[var(--line)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent)]"
                                }`}
                              >
                                <span className="block truncate text-label-sm font-semibold">{project.name}</span>
                                <span className="mt-sp-4 block truncate text-label-xs opacity-75">
                                  {project.icon_library} / {project.icon_name}
                                </span>
                                <span className="mt-sp-5 block text-label-xs opacity-75">
                                  {Array.isArray(project.sequences) ? project.sequences.length : 0} sequences
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "session" && (
                  <div className="space-y-sp-6">
                    {!user ? (
                      <p className="text-label-sm text-[var(--muted)]">Sign in from the Cloud saves tab first.</p>
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
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
