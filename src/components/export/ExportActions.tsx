"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { ExportPayload, ExportProgress } from "@/lib/export/animated-svg";
import {
  buildCssExport,
  buildReactExport,
  downloadAnimatedSvg,
  downloadHtmlExport,
  exportRasterAnimation,
} from "@/lib/export/animated-svg";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Select from "@/components/ui/Select";
import SignInModal from "@/components/auth/SignInModal";
import Glyph from "@/components/workshop/Glyph";
import ExportPreview from "./ExportPreview";

type CodeSnippet = "react" | "css";

export default function ExportActions({
  payload,
  label = "Export",
  fullWidth = false,
}: {
  payload: ExportPayload | null;
  label?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [size, setSize] = useState(768);
  const [fps, setFps] = useState(30);
  const [backgroundColor, setBackgroundColor] = useState("#0c0c0c");
  const [transparent, setTransparent] = useState(true);
  const [snippet, setSnippet] = useState<CodeSnippet>("react");
  const [justCopied, setJustCopied] = useState(false);
  const shakeControls = useAnimationControls();
  const disabled = !payload || busyFormat !== null;

  const shakeModal = () => {
    void shakeControls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.4, ease: "easeInOut" },
    });
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleTriggerClick = () => {
    if (supabase && !user) {
      setShowSignIn(true);
      return;
    }
    setOpen(true);
  };

  const snippetCode = useMemo(() => {
    if (!payload) return "";
    return snippet === "react" ? buildReactExport(payload) : buildCssExport(payload);
  }, [payload, snippet]);

  const trimmedFileName = fileName.trim() || undefined;

  const downloadVector = (format: "svg" | "html") => {
    if (!payload) return;
    if (format === "svg") downloadAnimatedSvg(payload, trimmedFileName);
    else downloadHtmlExport(payload, trimmedFileName);
    setStatusMessage(`${format.toUpperCase()} exported`);
  };

  const runRasterExport = async (format: "gif" | "mp4" | "webm") => {
    if (!payload) return;
    try {
      setBusyFormat(format);
      setStatusMessage(null);
      setProgress({ phase: "loading", progress: 0, message: "Loading FFmpeg" });
      await exportRasterAnimation(
        payload,
        format,
        { size, fps, backgroundColor, transparent },
        setProgress,
        trimmedFileName,
      );
      setStatusMessage(`${format.toUpperCase()} exported`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : `Could not export ${format.toUpperCase()}.`);
    } finally {
      setBusyFormat(null);
      setProgress(null);
    }
  };

  const copySnippet = async () => {
    if (!snippetCode) return;
    await navigator.clipboard.writeText(snippetCode);
    setJustCopied(true);
    setStatusMessage("Code copied");
    window.setTimeout(() => setJustCopied(false), 1600);
  };

  const triggerClass = fullWidth
    ? "min-h-sp-11 w-full rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-6 text-label-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    : "min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-6 text-label-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]";
  const buttonClass =
    "min-h-sp-11 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <button type="button" disabled={!payload} onClick={handleTriggerClick} className={triggerClass}>
        {label}
      </button>

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          title="Sign in to export"
          description="Create a free account to export your animation."
        />
      )}

      {open && payload && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-sp-6" onClick={shakeModal}>
          <motion.div
            onClick={(event) => event.stopPropagation()}
            animate={shakeControls}
            className="relative grid h-[640px] max-h-[88vh] w-full max-w-6xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] md:grid-cols-[280px_300px_minmax(0,1fr)]"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-sp-5 top-sp-5 z-10 grid h-sp-10 w-sp-10 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Close export"
            >
              <span className="absolute h-sp-1 w-sp-6 rotate-45 bg-current" />
              <span className="absolute h-sp-1 w-sp-6 -rotate-45 bg-current" />
            </button>

            <section className="min-h-0 overflow-y-auto border-b border-[var(--line)] p-sp-7 md:border-b-0 md:border-r">
              <h2 className="text-label-lg font-semibold">Preview</h2>
              <div className="mt-sp-5">
                <ExportPreview payload={payload} backgroundColor={backgroundColor} transparent={transparent} />
              </div>
              <p className="mt-sp-5 truncate text-label-xs text-[var(--muted)]">
                {payload.sequences.length} sequence{payload.sequences.length === 1 ? "" : "s"}
              </p>
            </section>

            <section className="min-h-0 overflow-y-auto border-b border-[var(--line)] p-sp-7 md:border-b-0 md:border-r">
              <h2 className="text-label-lg font-semibold">Export</h2>

              <label className="mt-sp-6 flex flex-col gap-sp-3 text-label-xs font-medium text-[var(--muted)]">
                File name
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder={payload.icon.name}
                  className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>

              <div className="mt-sp-6 space-y-sp-4">
                <p className="text-label-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">Static</p>
                <div className="grid grid-cols-2 gap-sp-4">
                  <button type="button" disabled={disabled} onClick={() => downloadVector("svg")} className={buttonClass}>
                    SVG
                  </button>
                  <button type="button" disabled={disabled} onClick={() => downloadVector("html")} className={buttonClass}>
                    HTML
                  </button>
                </div>
              </div>

              <div className="mt-sp-6 space-y-sp-4">
                <p className="text-label-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">Video</p>
                <div className="grid grid-cols-2 gap-sp-4">
                  <button type="button" disabled={disabled} onClick={() => runRasterExport("gif")} className={buttonClass}>
                    {busyFormat === "gif" ? "GIF..." : "GIF"}
                  </button>
                  <button type="button" disabled={disabled} onClick={() => runRasterExport("mp4")} className={buttonClass}>
                    {busyFormat === "mp4" ? "MP4..." : "MP4"}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => runRasterExport("webm")}
                    className={`${buttonClass} col-span-2`}
                  >
                    {busyFormat === "webm" ? "WEBM..." : "WEBM video"}
                  </button>
                </div>
              </div>

              <div className="mt-sp-6 grid grid-cols-2 gap-sp-4">
                <label className="flex flex-col gap-sp-3 text-label-xs font-medium text-[var(--muted)]">
                  Size
                  <Select value={size} onChange={(value) => setSize(Number(value))} ariaLabel="Export size">
                    <option value={512}>512px</option>
                    <option value={768}>768px</option>
                    <option value={1024}>1024px</option>
                  </Select>
                </label>
                <label className="flex flex-col gap-sp-3 text-label-xs font-medium text-[var(--muted)]">
                  FPS
                  <Select value={fps} onChange={(value) => setFps(Number(value))} ariaLabel="Export FPS">
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </Select>
                </label>
                <label className="flex flex-col gap-sp-3 text-label-xs font-medium text-[var(--muted)]">
                  Background
                  <input
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    className="min-h-sp-10 rounded-sm border border-[var(--line)] bg-[var(--background)] px-sp-4 text-label-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </label>
                <label className="flex min-h-sp-10 items-center justify-between gap-sp-5 self-end rounded-sm border border-[var(--line)] bg-[var(--background)] px-sp-4 text-label-xs font-medium text-[var(--muted)]">
                  <span className="inline-flex items-center gap-sp-3">
                    Alpha
                    <span
                      title="Alpha means transparent background. GIF and WebM can use it; MP4 will use the background color."
                      className="grid h-sp-6 w-sp-6 place-items-center rounded-full border border-[var(--line)] text-[10px] text-[var(--foreground)]"
                    >
                      ?
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(event) => setTransparent(event.target.checked)}
                    className="h-sp-6 w-sp-6 accent-[var(--accent)]"
                  />
                </label>
              </div>

              {progress ? (
                <div className="mt-sp-6 space-y-sp-3">
                  <div className="flex items-center justify-between text-label-xs text-[var(--muted)]">
                    <span>{progress.message}</span>
                    <span>{Math.round(progress.progress * 100)}%</span>
                  </div>
                  <div className="h-sp-2 w-full overflow-hidden rounded-full bg-[var(--control)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150"
                      style={{ width: `${Math.round(progress.progress * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                statusMessage && <p className="mt-sp-6 text-label-xs leading-5 text-[var(--muted)]">{statusMessage}</p>
              )}
            </section>

            <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] p-sp-7">
              <div className="mb-sp-6 flex items-center justify-between gap-sp-5 pr-sp-10">
                <div className="flex rounded-sm border border-[var(--line)]">
                  {(["react", "css"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSnippet(item)}
                      className={`min-h-sp-10 px-sp-6 text-label-xs font-semibold ${
                        snippet === item
                          ? "bg-[var(--active)] text-[var(--active-ink)]"
                          : "bg-[var(--control)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {item === "react" ? "React" : "CSS"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copySnippet}
                  disabled={!snippetCode}
                  className="flex min-h-sp-10 items-center gap-sp-3 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={justCopied ? "check" : "copy"}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="grid place-items-center"
                    >
                      <Glyph name={justCopied ? "check" : "copy"} className="h-sp-5 w-sp-5" />
                    </motion.span>
                  </AnimatePresence>
                  {justCopied ? "Copied" : "Copy code"}
                </button>
              </div>

              <pre className="min-h-0 overflow-auto rounded-sm border border-[var(--line)] bg-[var(--background)] p-sp-6 text-label-xs leading-5 text-[var(--foreground)]">
                <code>{snippetCode}</code>
              </pre>
            </section>
          </motion.div>
        </div>
      )}
    </>
  );
}
