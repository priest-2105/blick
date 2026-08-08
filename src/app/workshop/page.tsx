"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IconMeta } from "../../../types/icon";
import { getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { useProjectStore } from "@/lib/state/project-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listSavedProjects, saveProject, type SavedProject } from "@/lib/supabase/projects";
import { AnimatePresence } from "framer-motion";
import WorkshopHeader from "@/components/workshop/WorkshopHeader";
import SequenceRailPanel from "@/components/workshop/SequenceRailPanel";
import PreviewPane from "@/components/workshop/PreviewPane";
import SequenceDetailsPanel from "@/components/workshop/SequenceDetailsPanel";
import WorkshopProfileModal, { type ProfileModalTab } from "@/components/workshop/WorkshopProfileModal";
import {
  createDraftId,
  createInitialSequences,
  createSequence,
  getDraftIdFromPath,
  nextSequenceNumber,
  pushSequenceHistory,
  readLastLocalDraftId,
  readLocalDraft,
  sequenceOffsets,
  timelineDuration,
  writeLocalDraft,
  AVATAR_BUCKET,
  MAX_AVATAR_BYTES,
  MAX_TEXT_LENGTH,
  type AnimationSequence,
  type DeletedSequence,
  type PendingWorkshopDraft,
  type PlaybackMode,
  type SequenceHistory,
} from "@/lib/workshop/sequences";

export default function WorkshopPage() {
  const pathname = usePathname();
  const { icon, color, workshopDraft, clearWorkshopDraft, loadWorkshopDraft } = useProjectStore();
  const [restoreAttempted, setRestoreAttempted] = useState(false);
  const [queryDraftId, setQueryDraftId] = useState<string | null>(null);
  const pathDraftId = getDraftIdFromPath(pathname);
  const localDraftId = pathDraftId ?? queryDraftId;

  useEffect(() => {
    if (pathDraftId || queryDraftId) return;
    const timeout = window.setTimeout(() => setQueryDraftId(readLastLocalDraftId()), 0);
    return () => window.clearTimeout(timeout);
  }, [pathDraftId, queryDraftId]);

  useEffect(() => {
    if (icon || restoreAttempted) return;
    if (!localDraftId) {
      setRestoreAttempted(true);
      return;
    }
    const draft = readLocalDraft(localDraftId);
    if (draft) {
      loadWorkshopDraft({
        projectId: draft.projectId,
        localDraftId: draft.id,
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
        sequences: draft.sequences,
        activeSequenceId: draft.activeSequenceId,
      });
    }
    setRestoreAttempted(true);
  }, [icon, loadWorkshopDraft, localDraftId, restoreAttempted]);

  if (!icon && !restoreAttempted) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] p-sp-6 text-[var(--foreground)]">
        <div className="border border-[var(--line)] bg-[var(--surface)] p-sp-6 text-label-sm text-[var(--muted)]">
          Restoring workshop draft...
        </div>
      </main>
    );
  }

  if (!icon) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] p-sp-6 text-[var(--foreground)]">
        <div className="max-w-md border border-[var(--line)] bg-[var(--surface)] p-sp-6">
          <h1 className="text-title-h6 font-bold">Workshop</h1>
          <p className="mt-sp-5 text-label-sm leading-6 text-[var(--muted)]">
            Select or upload an SVG first, then use sequences to animate its strokes.
          </p>
          <Link
            href="/"
            className="mt-sp-7 inline-flex min-h-sp-10 items-center rounded-sm bg-[var(--accent)] px-sp-6 text-label-sm font-semibold text-[var(--active-ink)]"
          >
            Choose an icon
          </Link>
        </div>
      </main>
    );
  }

  const pendingDraft: PendingWorkshopDraft | null = workshopDraft
    ? {
        projectId: workshopDraft.projectId,
        localDraftId: workshopDraft.localDraftId ?? localDraftId,
        name: workshopDraft.name,
        sequences: workshopDraft.sequences,
        activeSequenceId: workshopDraft.activeSequenceId,
      }
    : null;

  return (
    <WorkshopEditor
      key={`${workshopDraft?.projectId ?? workshopDraft?.localDraftId ?? localDraftId ?? "draft"}-${icon.library}-${icon.name}-${icon.paths.length}`}
      icon={icon}
      color={color}
      pendingDraft={pendingDraft}
      onDraftConsumed={clearWorkshopDraft}
    />
  );
}

function WorkshopEditor({
  icon,
  color,
  pendingDraft,
  onDraftConsumed,
}: {
  icon: IconMeta;
  color: string;
  pendingDraft: PendingWorkshopDraft | null;
  onDraftConsumed: () => void;
}) {
  const initialSequences = useMemo(() => createInitialSequences(icon, pendingDraft), [icon, pendingDraft]);
  const [sequenceHistory, setSequenceHistory] = useState<SequenceHistory>(() => ({
    past: [],
    present: initialSequences,
    future: [],
  }));
  const sequences = sequenceHistory.present;
  const setSequences = useCallback(
    (next: AnimationSequence[] | ((current: AnimationSequence[]) => AnimationSequence[])) => {
      setSequenceHistory((current) => pushSequenceHistory(current, next));
    },
    [],
  );
  const nextSequenceIdRef = useRef(nextSequenceNumber(initialSequences));
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(
    () => pendingDraft?.activeSequenceId ?? sequences[0]?.id ?? null,
  );
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("loop");
  const [playheadMs, setPlayheadMs] = useState(0);
  const [deletedSequence, setDeletedSequence] = useState<DeletedSequence | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [projectName, setProjectName] = useState(pendingDraft?.name ?? icon.name);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(pendingDraft?.projectId ?? null);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<ProfileModalTab>("cloud");
  const [localDraftId] = useState(() => pendingDraft?.localDraftId ?? createDraftId());
  const [profileName, setProfileName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const projectNameRef = useRef(projectName);
  useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const loadWorkshopDraft = useProjectStore((state) => state.loadWorkshopDraft);

  const activeSequence =
    sequences.find((sequence) => sequence.id === activeSequenceId) ?? sequences[0] ?? null;
  const availableAnimations = getAvailableAnimations(icon.isStrokeBased);
  const activeDefinition = activeSequence ? getAnimation(activeSequence.animationId) : undefined;
  const totalMs = timelineDuration(sequences);
  const offsets = useMemo(() => sequenceOffsets(sequences), [sequences]);
  const exportPayload = useMemo(
    () => ({
      icon,
      color,
      sequences,
    }),
    [icon, color, sequences],
  );
  const activeOffset = activeSequence
    ? offsets[sequences.findIndex((sequence) => sequence.id === activeSequence.id)]
    : undefined;

  useEffect(() => {
    if (pendingDraft) onDraftConsumed();
  }, [onDraftConsumed, pendingDraft]);

  useEffect(() => {
    writeLocalDraft({
      id: localDraftId,
      projectId: currentProjectId,
      name: projectName,
      icon,
      color,
      sequences,
      activeSequenceId,
      updatedAt: new Date().toISOString(),
    });
  }, [activeSequenceId, color, currentProjectId, icon, localDraftId, projectName, sequences]);

  useEffect(() => {
    if (!deletedSequence) return;
    const timeout = window.setTimeout(() => setDeletedSequence(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [deletedSequence]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("authError");
    if (!error) return;
    setAuthMessage(error);
    setProfileModalTab("cloud");
    setShowProfileModal(true);
    params.delete("authError");
    const nextSearch = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProjects = useCallback(async (currentUser: User | null, options?: { silent?: boolean }) => {
    if (!currentUser) {
      setProjects([]);
      return;
    }
    setIsRefreshing(true);
    const result = await listSavedProjects();
    setProjects(result.projects);
    if (options?.silent) {
      if (!result.error) setProjectMessage(null);
    } else {
      setProjectMessage(result.error);
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      const nextUser = data.user ?? null;
      setUser(nextUser);
      setProfileName((nextUser?.user_metadata?.display_name as string | undefined) ?? "");
      setProfileAvatarUrl((nextUser?.user_metadata?.avatar_url as string | undefined) ?? "");
      void refreshProjects(nextUser, { silent: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      const nextDisplayName = (nextUser?.user_metadata?.display_name as string | undefined) ?? "";
      const nextAvatarUrl = (nextUser?.user_metadata?.avatar_url as string | undefined) ?? "";
      setProfileName(nextDisplayName);
      setProfileAvatarUrl(nextAvatarUrl);
      void refreshProjects(nextUser, { silent: true });

      if (event === "SIGNED_IN" && nextUser) {
        const complete =
          projectNameRef.current.trim().length > 0 &&
          nextDisplayName.trim().length > 0 &&
          nextAvatarUrl.trim().length > 0;
        if (complete) {
          setProfileModalTab("cloud");
        } else {
          setProfileModalTab("profile");
          setShowProfileModal(true);
          setProfileMessage("Add a display name, avatar, and project name to start autosaving to your account.");
        }
      } else if (event === "SIGNED_OUT") {
        setNotice("Signed out — this workshop now saves locally only.");
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProjects, supabase]);

  const sendSignInLink = async () => {
    if (!supabase) {
      setAuthMessage("Add Supabase env vars to enable cloud saves.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthMessage("Enter an email address.");
      return;
    }

    setIsSendingLink(true);
    const next = encodeURIComponent(`/workshop/${localDraftId}`);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
    setIsSendingLink(false);
    setAuthMessage(error ? error.message : "Check your email for the sign-in link.");
  };

  const updateProfile = async () => {
    if (!supabase || !user) return;
    setIsUpdatingProfile(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: profileName.trim().slice(0, MAX_TEXT_LENGTH),
        avatar_url: profileAvatarUrl.trim().slice(0, 500),
      },
    });
    setIsUpdatingProfile(false);
    if (error) {
      setProfileMessage(error.message);
      return;
    }
    setUser(data.user);
    setProfileMessage("Profile updated.");
  };

  const uploadAvatar = async (file: File | undefined) => {
    if (!file || !supabase || !user) return;
    if (!file.type.startsWith("image/")) {
      setProfileMessage("Upload an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setProfileMessage("Avatar image must be 4 MB or smaller.");
      return;
    }

    setIsUploadingAvatar(true);
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      setIsUploadingAvatar(false);
      setProfileMessage(error.message);
      return;
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    setProfileAvatarUrl(data.publicUrl);
    setIsUploadingAvatar(false);
    setProfileMessage("Avatar uploaded. Save profile to keep it.");
  };

  const isProfileComplete = () =>
    projectName.trim().length > 0 &&
    profileName.trim().length > 0 &&
    profileAvatarUrl.trim().length > 0;

  const deleteAccount = async () => {
    if (!window.confirm("Delete this account and all saved projects? This cannot be undone.")) return;
    setIsDeletingAccount(true);
    const response = await fetch("/api/account/delete", { method: "DELETE" });
    setIsDeletingAccount(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setProfileMessage(data?.error ?? "Could not delete account.");
      return;
    }

    await supabase?.auth.signOut();
    setUser(null);
    setProjects([]);
    setShowProfileModal(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProjects([]);
    setCurrentProjectId(null);
    setProjectMessage(null);
  };

  const performSave = useCallback(async () => {
    if (!user) return;
    setSaveStatus("saving");
    const result = await saveProject({
      id: currentProjectId,
      user,
      name: projectName,
      icon,
      color,
      sequences,
    });

    if (result.error) {
      setSaveStatus("error");
      setProjectMessage(result.error);
      return;
    }

    if (result.project) {
      setCurrentProjectId(result.project.id);
      setSaveStatus("saved");
      void refreshProjects(user, { silent: true });
    }
  }, [color, currentProjectId, icon, projectName, refreshProjects, sequences, user]);

  useEffect(() => {
    if (!user || !isProfileComplete()) return;
    const signature = JSON.stringify({ name: projectName, color, sequences });
    if (signature === lastSavedSignatureRef.current) return;

    const timeout = window.setTimeout(() => {
      lastSavedSignatureRef.current = signature;
      void performSave();
    }, 1200);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectName, profileName, profileAvatarUrl, color, sequences, performSave]);

  const handleSaveNow = () => {
    if (!isProfileComplete()) {
      setProfileModalTab("profile");
      setProfileMessage("Add a display name, avatar, and project name to enable saving.");
      return;
    }
    lastSavedSignatureRef.current = JSON.stringify({ name: projectName, color, sequences });
    void performSave();
  };

  const openProfileModal = () => {
    setShowProfileModal(true);
    if (!user) setProfileModalTab("cloud");
  };

  const loadSavedProject = (project: SavedProject) => {
    loadWorkshopDraft({
      projectId: project.id,
      localDraftId: project.id,
      name: project.name,
      icon: project.icon_data,
      color: project.color,
      sequences: project.sequences,
      activeSequenceId: null,
    });
    setShowProfileModal(false);
  };

  const undoSequenceEdit = () => {
    setSequenceHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  };

  const redoSequenceEdit = () => {
    setSequenceHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return {
        past: [...current.past, current.present].slice(-60),
        present: next,
        future: current.future.slice(1),
      };
    });
  };

  const updateSequence = (id: string, patch: Partial<AnimationSequence>) => {
    setSequences((current) =>
      current.map((sequence) => (sequence.id === id ? { ...sequence, ...patch } : sequence)),
    );
  };

  const updateSequenceParam = (id: string, key: string, value: unknown) => {
    setSequences((current) =>
      current.map((sequence) =>
        sequence.id === id
          ? { ...sequence, params: { ...sequence.params, [key]: value } }
          : sequence,
      ),
    );
  };

  const addSequence = () => {
    const next = createSequence({
      id: `sequence-${nextSequenceIdRef.current}`,
      index: sequences.length,
      icon,
      pathIndexes: [],
    });
    nextSequenceIdRef.current += 1;
    setSequences((current) => [...current, next]);
    setActiveSequenceId(next.id);
  };

  const applyPreset = (preset: "draw-pulse" | "stagger-pop" | "logo-intro") => {
    const allPaths = icon.paths.map((_, index) => index);
    const midpoint = Math.max(1, Math.ceil(allPaths.length / 2));
    const nextId = () => {
      const id = `sequence-${nextSequenceIdRef.current}`;
      nextSequenceIdRef.current += 1;
      return id;
    };
    const next =
      preset === "draw-pulse"
        ? [
            createSequence({
              id: nextId(),
              index: 0,
              icon,
              pathIndexes: allPaths,
              animationId: icon.isStrokeBased ? "draw-on" : "fade-in",
              name: icon.isStrokeBased ? "Draw" : "Reveal",
            }),
            createSequence({
              id: nextId(),
              index: 1,
              icon,
              pathIndexes: allPaths,
              animationId: "pulse",
              name: "Settle",
              delayMs: 120,
            }),
          ]
        : preset === "stagger-pop"
          ? [
              createSequence({
                id: nextId(),
                index: 0,
                icon,
                pathIndexes: allPaths.slice(0, midpoint),
                animationId: "stagger-reveal",
                name: "Lead strokes",
              }),
              createSequence({
                id: nextId(),
                index: 1,
                icon,
                pathIndexes: allPaths.slice(midpoint),
                animationId: "pop-in",
                name: "Secondary pop",
                delayMs: 80,
              }),
            ]
          : [
              createSequence({
                id: nextId(),
                index: 0,
                icon,
                pathIndexes: allPaths,
                animationId: "rise-in",
                name: "Entrance",
              }),
              createSequence({
                id: nextId(),
                index: 1,
                icon,
                pathIndexes: allPaths,
                animationId: "spin-in",
                name: "Mark turn",
                delayMs: 80,
              }),
              createSequence({
                id: nextId(),
                index: 2,
                icon,
                pathIndexes: allPaths,
                animationId: "pulse",
                name: "Hold",
                delayMs: 120,
              }),
            ];

    setSequences(next);
    setActiveSequenceId(next[0]?.id ?? null);
    setPlayheadMs(0);
    setIsPlaying(true);
    setDeletedSequence(null);
  };

  const duplicateSequence = (sequence: AnimationSequence) => {
    const copy = {
      ...sequence,
      id: `sequence-${nextSequenceIdRef.current}`,
      name: `${sequence.name} copy`,
    };
    nextSequenceIdRef.current += 1;
    const sourceIndex = sequences.findIndex((item) => item.id === sequence.id);
    const next = [
      ...sequences.slice(0, sourceIndex + 1),
      copy,
      ...sequences.slice(sourceIndex + 1),
    ];
    setSequences(next);
    setActiveSequenceId(copy.id);
  };

  const removeSequence = (id: string) => {
    if (sequences.length === 1) return;
    const removedIndex = sequences.findIndex((sequence) => sequence.id === id);
    const removed = sequences[removedIndex];
    if (!removed) return;
    const next = sequences.filter((sequence) => sequence.id !== id);
    setSequences(next);
    if (activeSequenceId === id) setActiveSequenceId(next[0]?.id ?? null);
    setDeletedSequence({ sequence: removed, index: removedIndex, activeSequenceId });
  };

  const undoDelete = () => {
    if (!deletedSequence) return;
    const next = [
      ...sequences.slice(0, deletedSequence.index),
      deletedSequence.sequence,
      ...sequences.slice(deletedSequence.index),
    ];
    setSequences(next);
    setActiveSequenceId(deletedSequence.activeSequenceId ?? deletedSequence.sequence.id);
    setDeletedSequence(null);
  };

  const togglePath = (pathIndex: number) => {
    if (!activeSequence) return;
    const exists = activeSequence.pathIndexes.includes(pathIndex);
    updateSequence(activeSequence.id, {
      pathIndexes: exists
        ? activeSequence.pathIndexes.filter((index) => index !== pathIndex)
        : [...activeSequence.pathIndexes, pathIndex].sort((a, b) => a - b),
    });
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <WorkshopHeader
        icon={icon}
        sequenceCount={sequences.length}
        user={user}
        profileAvatarUrl={profileAvatarUrl}
        profileName={profileName}
        onOpenProfile={openProfileModal}
      />

      <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)_390px]">
        <SequenceRailPanel
          totalMs={totalMs}
          sequences={sequences}
          onReorder={setSequences}
          offsets={offsets}
          activeSequenceId={activeSequence?.id ?? null}
          onAddSequence={addSequence}
          onApplyPreset={applyPreset}
          onSelectSequence={setActiveSequenceId}
          onDuplicateSequence={duplicateSequence}
          onDeleteSequence={removeSequence}
          exportPayload={exportPayload}
        />

        <PreviewPane
          icon={icon}
          color={color}
          sequences={sequences}
          activeSequenceId={activeSequence?.id ?? null}
          hoveredPathIndex={hoveredPathIndex}
          playheadMs={playheadMs}
          isPlaying={isPlaying}
          playbackMode={playbackMode}
          totalMs={totalMs}
          canUndo={sequenceHistory.past.length > 0}
          canRedo={sequenceHistory.future.length > 0}
          onPathToggle={togglePath}
          onPathHover={setHoveredPathIndex}
          onPlayheadChange={setPlayheadMs}
          onTogglePlaying={() => setIsPlaying((current) => !current)}
          onReset={() => {
            setIsPlaying(false);
            setPlayheadMs(0);
          }}
          onUndo={undoSequenceEdit}
          onRedo={redoSequenceEdit}
          onPlaybackModeChange={setPlaybackMode}
          onScrub={(timeMs) => {
            setIsPlaying(false);
            setPlayheadMs(timeMs);
          }}
          onSelectSequence={setActiveSequenceId}
        />

        <aside className="min-h-0 overflow-y-auto bg-[var(--surface)]">
          {activeSequence && activeDefinition ? (
            <SequenceDetailsPanel
              icon={icon}
              activeSequence={activeSequence}
              activeDefinition={activeDefinition}
              activeOffset={activeOffset}
              availableAnimations={availableAnimations}
              hoveredPathIndex={hoveredPathIndex}
              onHoverPath={setHoveredPathIndex}
              canDelete={sequences.length > 1}
              onUpdateSequence={updateSequence}
              onUpdateSequenceParam={updateSequenceParam}
              onDeleteSequence={removeSequence}
              onTogglePath={togglePath}
            />
          ) : (
            <div className="p-sp-7 text-label-sm text-[var(--muted)]">Create a sequence to begin.</div>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {showProfileModal && (
          <WorkshopProfileModal
            onClose={() => setShowProfileModal(false)}
            activeTab={profileModalTab}
            onTabChange={setProfileModalTab}
            user={user}
            supabaseConfigured={Boolean(supabase)}
            email={email}
            onEmailChange={setEmail}
            authMessage={authMessage}
            isSendingLink={isSendingLink}
            onSendSignInLink={sendSignInLink}
            profileAvatarUrl={profileAvatarUrl}
            profileName={profileName}
            onProfileNameChange={setProfileName}
            projectName={projectName}
            onProjectNameChange={setProjectName}
            onUploadAvatar={uploadAvatar}
            isUploadingAvatar={isUploadingAvatar}
            onUpdateProfile={updateProfile}
            isUpdatingProfile={isUpdatingProfile}
            profileMessage={profileMessage}
            saveStatus={saveStatus}
            saveMessage={projectMessage}
            onSaveNow={handleSaveNow}
            currentProjectId={currentProjectId}
            projects={projects}
            onSelectProject={loadSavedProject}
            onRefreshProjects={() => refreshProjects(user)}
            isRefreshingProjects={isRefreshing}
            onSignOut={signOut}
            onDeleteAccount={deleteAccount}
            isDeletingAccount={isDeletingAccount}
          />
        )}
      </AnimatePresence>

      {notice && (
        <div className="fixed right-sp-7 top-sp-7 z-[80] max-w-xs border border-[var(--line-strong)] bg-[var(--surface)] px-sp-6 py-sp-5 text-label-sm text-[var(--foreground)]">
          {notice}
        </div>
      )}

      {deletedSequence && (
        <div className="fixed bottom-sp-7 left-1/2 z-50 flex min-h-sp-11 -translate-x-1/2 items-center gap-sp-6 border border-[var(--line-strong)] bg-[var(--surface)] px-sp-6 text-label-sm text-[var(--foreground)]">
          <span>{deletedSequence.sequence.name} deleted</span>
          <button
            type="button"
            onClick={undoDelete}
            className="font-semibold text-[var(--accent)] hover:text-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Undo
          </button>
        </div>
      )}
    </main>
  );
}
