"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { IconMeta } from "../../../types/icon";
import { loadIcon } from "@/lib/icons/load-icon";
import LivePreview from "@/components/detail/LivePreview";
import Glyph from "@/components/workshop/Glyph";

const STEPS: { title: string; description: string }[] = [
  {
    title: "1. Pick an icon",
    description: "Browse or search icons from Lucide, Tabler, Heroicons, and more — or upload your own SVG.",
  },
  {
    title: "2. Open the workshop",
    description: "Click an icon, then “Open in workshop” to start building an animation for it.",
  },
  {
    title: "3. Build a sequence",
    description: "Select which strokes belong to a sequence, then choose an animation — draw-on, fade, pop, and more.",
  },
  {
    title: "4. Tune the timing",
    description: "Adjust duration, delay, direction, and easing until the motion feels right for that sequence.",
  },
  {
    title: "5. Layer more sequences",
    description: "Add sequences to animate different strokes at different times, building up a full multi-stage animation.",
  },
  {
    title: "6. Preview and export",
    description: "Scrub the timeline to check every stage, then export as SVG, HTML, React/CSS code, GIF, MP4, or WebM.",
  },
];

export default function HelpModal({ onClose }: { onClose: () => void }) {
  const [clockIcon, setClockIcon] = useState<IconMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIcon("lucide", "clock").then(
      (icon) => {
        if (!cancelled) setClockIcon(icon);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-sp-6 backdrop-blur-md"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]"
      >
        <div className="flex items-start justify-between gap-sp-6 border-b border-[var(--line)] p-sp-7">
          <div>
            <h2 className="text-label-lg font-semibold">How Blick works</h2>
            <p className="mt-sp-3 text-label-xs leading-5 text-[var(--muted)]">
              Browse icon libraries, animate their strokes, and export the result as code, an image, or a video.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-sp-10 w-sp-10 shrink-0 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Close help"
          >
            <Glyph name="close" className="h-sp-5 w-sp-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-sp-7">
          <div className="flex flex-col items-center gap-sp-5 border border-[var(--line)] bg-[var(--background)] p-sp-7 sm:flex-row">
            <div className="h-sp-16 w-sp-16 shrink-0">
              {clockIcon ? (
                <LivePreview
                  icon={clockIcon}
                  color="var(--accent)"
                  animationId="draw-on"
                  params={{ easing: "ease-out" }}
                  durationMs={1400}
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded-full bg-[var(--control)]" />
              )}
            </div>
            <p className="text-label-xs leading-5 text-[var(--muted)]">
              This clock is a live example: its circle and hands are separate strokes, animated with the{" "}
              <span className="font-semibold text-[var(--foreground)]">draw-on</span> effect — exactly the kind of
              sequence you&rsquo;ll build in the workshop.
            </p>
          </div>

          <div className="mt-sp-7 grid gap-sp-5 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.title} className="border border-[var(--line)] p-sp-5">
                <h3 className="text-label-sm font-semibold">{step.title}</h3>
                <p className="mt-sp-3 text-label-xs leading-5 text-[var(--muted)]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
