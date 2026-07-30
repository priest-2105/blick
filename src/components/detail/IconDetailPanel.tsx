"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { IconMeta, IconSearchEntry } from "../../../types/icon";
import { loadIcon } from "@/lib/icons/load-icon";
import { getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { useProjectStore } from "@/lib/state/project-store";
import LivePreview from "./LivePreview";
import ColorPicker from "./ColorPicker";
import ParamControls from "./ParamControls";

export default function IconDetailPanel({
  entry,
  onClose,
}: {
  entry: IconSearchEntry;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loadedIcon, setLoadedIcon] = useState<{
    key: string;
    data: IconMeta;
  } | null>(null);
  const {
    color,
    setColor,
    animationId,
    setAnimationId,
    params,
    setParam,
    durationMs,
    setDurationMs,
    setIcon,
  } = useProjectStore();
  const entryKey = `${entry.library}:${entry.name}`;
  const icon = loadedIcon?.key === entryKey ? loadedIcon.data : null;
  const titleId = useId();

  useEffect(() => {
    let cancelled = false;
    loadIcon(entry.library, entry.name).then((data) => {
      if (!cancelled) setLoadedIcon({ key: `${entry.library}:${entry.name}`, data });
    });
    return () => {
      cancelled = true;
    };
  }, [entry.library, entry.name]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const available = icon ? getAvailableAnimations(icon.isStrokeBased) : [];
  const selectedDefinition = getAnimation(animationId);
  const definition =
    selectedDefinition && available.some((animation) => animation.id === selectedDefinition.id)
      ? selectedDefinition
      : available[0];

  const handleAnimationChange = (id: string) => {
    const nextDefinition = getAnimation(id);
    setAnimationId(id);
    if (nextDefinition) setDurationMs(nextDefinition.defaultDurationMs);
  };

  const useIcon = () => {
    if (!icon) return;
    setIcon(icon);
    router.push("/workshop");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative grid h-[min(760px,92vh)] w-full max-w-6xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] md:grid-cols-[minmax(420px,1.08fr)_minmax(360px,0.92fr)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Close icon details"
        >
          <span className="absolute h-px w-4 rotate-45 bg-current" />
          <span className="absolute h-px w-4 -rotate-45 bg-current" />
        </button>

        {!icon ? (
          <div className="col-span-full grid place-items-center text-sm text-[var(--muted)]">
            Loading icon...
          </div>
        ) : (
          <>
            <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-b border-[var(--line)] bg-[var(--background)] md:border-b-0 md:border-r">
              <header className="border-b border-[var(--line)] p-5 pr-16">
                <p className="text-xs text-[var(--subtle)]">{icon.library}</p>
                <h2
                  id={titleId}
                  className="mt-1 break-words text-2xl font-semibold leading-tight text-[var(--foreground)]"
                >
                  {icon.name}
                </h2>
              </header>

              <div className="grid min-h-0 place-items-center p-6 sm:p-8">
                <div className="grid aspect-square w-full max-w-[420px] place-items-center border border-[var(--line-strong)] bg-[var(--panel)] p-12">
                  <div className="h-full w-full max-w-64">
                    <LivePreview
                      icon={icon}
                      color={color}
                      animationId={definition?.id ?? "fade-in"}
                      params={params}
                      durationMs={durationMs}
                    />
                  </div>
                </div>
              </div>

              <footer className="grid grid-cols-3 border-t border-[var(--line)] text-xs">
                <div className="border-r border-[var(--line)] p-4">
                  <p className="text-[var(--subtle)]">Type</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">
                    {icon.isStrokeBased ? "Stroke" : "Filled"}
                  </p>
                </div>
                <div className="border-r border-[var(--line)] p-4">
                  <p className="text-[var(--subtle)]">Paths</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{icon.paths.length}</p>
                </div>
                <div className="p-4">
                  <p className="text-[var(--subtle)]">Cycle</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{durationMs}ms</p>
                </div>
              </footer>
            </section>

            <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
              <header className="border-b border-[var(--line)] p-5 pr-14">
                <p className="text-xs text-[var(--subtle)]">Style controls</p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  Tune animation
                </h3>
              </header>

              <div className="min-h-0 overflow-y-auto p-4">
                <div className="border border-[var(--line)]">
                  <div className="border-b border-[var(--line)] p-3">
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">Color</h4>
                  </div>
                  <div className="p-3">
                    <ColorPicker color={color} onChange={setColor} />
                  </div>
                </div>

                <div className="mt-4 border border-[var(--line)]">
                  <div className="border-b border-[var(--line)] p-3">
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">Animation</h4>
                  </div>

                  <div className="p-3">
                    {available.length === 0 ? (
                      <p className="border border-[var(--line)] bg-[var(--panel)] p-3 text-sm leading-6 text-[var(--muted)]">
                        This filled icon does not expose stroke paths, so draw-on animation is not
                        available yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--muted)]">
                          Treatment
                          <select
                            value={definition?.id}
                            onChange={(e) => handleAnimationChange(e.target.value)}
                            className="min-h-10 border border-[var(--line-strong)] bg-[var(--control)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          >
                            {available.map((animation) => (
                              <option key={animation.id} value={animation.id}>
                                {animation.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {definition && (
                          <ParamControls
                            definition={definition}
                            params={params}
                            durationMs={durationMs}
                            onParamChange={setParam}
                            onDurationChange={setDurationMs}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <footer className="border-t border-[var(--line-strong)] bg-[var(--background)] p-4">
                <button
                  type="button"
                  onClick={useIcon}
                  className="min-h-12 w-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
                >
                  Use this icon
                </button>
                <p className="mt-2 text-center text-xs leading-5 text-[var(--subtle)]">
                  Opens the workshop with this icon, color, animation, and timing.
                </p>
              </footer>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
