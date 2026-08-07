"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { IconMeta, IconSearchEntry } from "../../../types/icon";
import { loadIcon } from "@/lib/icons/load-icon";
import { getAnimation, getAvailableAnimations } from "@/lib/animation/registry";
import { singleSequencePayload } from "@/lib/export/animated-svg";
import { useProjectStore } from "@/lib/state/project-store";
import { createDraftId } from "@/lib/workshop/sequences";
import ExportActions from "@/components/export/ExportActions";
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

  const exportPayload =
    icon && definition
      ? singleSequencePayload({
          icon,
          animationId: definition.id,
          params,
          durationMs,
          color,
        })
      : null;

  const saveAndOpenWorkshop = () => {
    if (!icon) return;
    setIcon(icon);
    router.push(`/workshop/${createDraftId()}`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-sp-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-md border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-sp-4 top-sp-4 z-20 grid h-sp-9 w-sp-9 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Close"
        >
          <span className="absolute h-sp-1 w-sp-5 rotate-45 bg-current" />
          <span className="absolute h-sp-1 w-sp-5 -rotate-45 bg-current" />
        </button>

        {!icon ? (
          <div className="grid min-h-40 place-items-center text-label-sm text-[var(--muted)]">
            Loading...
          </div>
        ) : (
          <>
            <div className="grid place-items-center gap-sp-4 border-b border-[var(--line)] p-sp-8 pt-sp-9">
              <div className="h-sp-14 w-sp-14">
                <LivePreview
                  icon={icon}
                  color={color}
                  animationId={definition?.id ?? "fade-in"}
                  params={params}
                  durationMs={durationMs}
                />
              </div>
              <div className="text-center">
                <h2 id={titleId} className="text-label-md font-semibold text-[var(--foreground)]">
                  {icon.name}
                </h2>
                <p className="text-label-xs text-[var(--subtle)]">{icon.library}</p>
              </div>
            </div>

            <div className="min-h-0 space-y-sp-5 overflow-y-auto p-sp-6">
              <ColorPicker color={color} onChange={setColor} />

              {available.length === 0 ? (
                <p className="text-label-xs leading-5 text-[var(--muted)]">
                  No stroke paths available for this icon.
                </p>
              ) : (
                <div className="space-y-sp-5">
                  <label className="flex flex-col gap-sp-3 text-label-xs font-medium text-[var(--muted)]">
                    Animation
                    <select
                      value={definition?.id}
                      onChange={(e) => handleAnimationChange(e.target.value)}
                      className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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

            <div className="grid grid-cols-2 gap-sp-4 border-t border-[var(--line)] p-sp-5">
              <button
                type="button"
                onClick={saveAndOpenWorkshop}
                className="min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-5 text-label-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]"
              >
                Open in workshop
              </button>
              <ExportActions payload={exportPayload} label="Export" fullWidth />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
