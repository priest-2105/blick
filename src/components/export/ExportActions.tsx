"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { ExportPayload } from "@/lib/export/animated-svg";
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
  const [status, setStatus] = useState<string | null>(null);
  const [size, setSize] = useState(768);
  const [fps, setFps] = useState(30);
  const [backgroundColor, setBackgroundColor] = useState("#0c0c0c");
  const [transparent, setTransparent] = useState(true);
  const [snippet, setSnippet] = useState<CodeSnippet>("react");
  const disabled = !payload || busyFormat !== null;

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

  const runRasterExport = async (format: "gif" | "mp4" | "webm") => {
    if (!payload) return;
    try {
      setBusyFormat(format);
      setStatus("Preparing FFmpeg");
      await exportRasterAnimation(
        payload,
        format,
        {
          size,
          fps,
          backgroundColor,
          transparent,
        },
        setStatus,
      );
      setStatus(`${format.toUpperCase()} exported`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not export ${format.toUpperCase()}.`);
    } finally {
      setBusyFormat(null);
    }
  };

  const copySnippet = async () => {
    if (!snippetCode) return;
    await navigator.clipboard.writeText(snippetCode);
    setStatus("Code copied");
  };

  const triggerClass = fullWidth
    ? "min-h-sp-11 w-full rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-6 text-label-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    : "min-h-sp-10 rounded-sm bg-[var(--accent)] px-sp-6 text-label-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]";
  const buttonClass =
    "min-h-sp-11 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        disabled={!payload}
        onClick={handleTriggerClick}
        className={triggerClass}
      >
        {label}
      </button>

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          title="Sign in to export"
          description="Create a free account to export your animation."
        />
      )}

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-sp-6">
          <div className="relative grid max-h-[88vh] w-full max-w-5xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] md:grid-cols-[340px_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-sp-5 top-sp-5 z-10 grid h-sp-10 w-sp-10 place-items-center rounded-sm border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Close export"
            >
              <span className="absolute h-sp-1 w-sp-6 rotate-45 bg-current" />
              <span className="absolute h-sp-1 w-sp-6 -rotate-45 bg-current" />
            </button>

            <section className="border-b border-[var(--line)] p-sp-7 pr-sp-12 md:border-b-0 md:border-r">
              <h2 className="text-label-lg font-semibold">Export</h2>
              <p className="mt-sp-3 truncate text-label-xs text-[var(--muted)]">{payload?.icon.name}</p>

              <div className="mt-sp-7 grid grid-cols-2 gap-sp-4">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => payload && downloadAnimatedSvg(payload)}
                  className={buttonClass}
                >
                  SVG
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => payload && downloadHtmlExport(payload)}
                  className={buttonClass}
                >
                  HTML
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => runRasterExport("gif")}
                  className={buttonClass}
                >
                  {busyFormat === "gif" ? "GIF..." : "GIF"}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => runRasterExport("mp4")}
                  className={buttonClass}
                >
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

              <div className="mt-sp-7 grid grid-cols-2 gap-sp-4">
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

              {status && <p className="mt-sp-6 text-label-xs leading-5 text-[var(--muted)]">{status}</p>}
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
                  className="min-h-sp-10 rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                >
                  Copy code
                </button>
              </div>

              <pre className="min-h-0 overflow-auto rounded-sm border border-[var(--line)] bg-[var(--background)] p-sp-6 text-label-xs leading-5 text-[var(--foreground)]">
                <code>{snippetCode}</code>
              </pre>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
