"use client";

import type { SavedProject } from "@/lib/supabase/projects";

export default function ProjectsModal({
  projects,
  currentProjectId,
  onClose,
  onSelectProject,
}: {
  projects: SavedProject[];
  currentProjectId: string | null;
  onClose: () => void;
  onSelectProject: (project: SavedProject) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-sp-6">
      <section className="max-h-[86vh] w-full max-w-5xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]">
        <div className="flex items-start justify-between gap-sp-6 border-b border-[var(--line)] p-sp-7">
          <div>
            <h2 className="text-label-lg font-semibold">Past sequences</h2>
            <p className="mt-sp-3 text-label-xs text-[var(--muted)]">
              Saved workshop projects from your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative grid h-sp-10 w-sp-10 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Close past sequences"
          >
            <span className="absolute h-sp-1 w-sp-6 rotate-45 bg-current" />
            <span className="absolute h-sp-1 w-sp-6 -rotate-45 bg-current" />
          </button>
        </div>

        <div className="max-h-[calc(86vh-84px)] overflow-y-auto p-sp-7">
          {projects.length === 0 ? (
            <div className="border border-[var(--line)] bg-[var(--background)] p-sp-8 text-label-sm text-[var(--muted)]">
              No saved sequences yet.
            </div>
          ) : (
            <div className="grid gap-sp-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className={`min-h-sp-15 border p-sp-6 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                    currentProjectId === project.id
                      ? "border-[var(--accent)] bg-[var(--active)] text-[var(--active-ink)]"
                      : "border-[var(--line)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="block truncate text-label-sm font-semibold">{project.name}</span>
                  <span className="mt-sp-5 block truncate text-label-xs opacity-75">
                    {project.icon_library} / {project.icon_name}
                  </span>
                  <span className="mt-sp-7 block text-label-xs opacity-75">
                    {Array.isArray(project.sequences) ? project.sequences.length : 0} sequences
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
