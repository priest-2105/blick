"use client";

import { useMemo, useState } from "react";
import type { ExportPayload } from "@/lib/export/animated-svg";
import {
  buildCssExport,
  buildReactExport,
  downloadAnimatedSvg,
  downloadHtmlExport,
  exportRasterAnimation,
} from "@/lib/export/animated-svg";

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
  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [size, setSize] = useState(768);
  const [fps, setFps] = useState(30);
  const [backgroundColor, setBackgroundColor] = useState("#0c0c0c");
  const [transparent, setTransparent] = useState(true);
  const [snippet, setSnippet] = useState<CodeSnippet>("react");
  const disabled = !payload || busyFormat !== null;

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
    ? "min-h-12 w-full border border-[var(--line-strong)] bg-[var(--control)] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    : "min-h-10 bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--active-ink)] transition-colors hover:bg-[var(--active)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]";
  const buttonClass =
    "min-h-11 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        disabled={!payload}
        onClick={() => setOpen(true)}
        className={triggerClass}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4">
          <div className="relative grid max-h-[88vh] w-full max-w-5xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] md:grid-cols-[340px_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center border border-[var(--line)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Close export"
            >
              <span className="absolute h-px w-4 rotate-45 bg-current" />
              <span className="absolute h-px w-4 -rotate-45 bg-current" />
            </button>

            <section className="border-b border-[var(--line)] p-5 pr-14 md:border-b-0 md:border-r">
              <h2 className="text-lg font-semibold">Export</h2>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">{payload?.icon.name}</p>

              <div className="mt-5 grid grid-cols-2 gap-2">
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

              <div className="mt-5 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
                  Size
                  <select
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                    className="min-h-9 border border-[var(--line)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value={512}>512px</option>
                    <option value={768}>768px</option>
                    <option value={1024}>1024px</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
                  FPS
                  <select
                    value={fps}
                    onChange={(event) => setFps(Number(event.target.value))}
                    className="min-h-9 border border-[var(--line)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value={24}>24</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
                  Background
                  <input
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    className="min-h-9 border border-[var(--line)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </label>
                <label className="flex min-h-9 items-center justify-between gap-3 self-end border border-[var(--line)] bg-[var(--background)] px-2 text-xs font-medium text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    Alpha
                    <span
                      title="Alpha means transparent background. GIF and WebM can use it; MP4 will use the background color."
                      className="grid h-4 w-4 place-items-center border border-[var(--line)] text-[10px] text-[var(--foreground)]"
                    >
                      ?
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(event) => setTransparent(event.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
              </div>

              {status && <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{status}</p>}
            </section>

            <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                <div className="flex border border-[var(--line)]">
                  {(["react", "css"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSnippet(item)}
                      className={`min-h-9 px-4 text-xs font-semibold ${
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
                  className="min-h-9 border border-[var(--line-strong)] bg-[var(--control)] px-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                >
                  Copy code
                </button>
              </div>

              <pre className="min-h-0 overflow-auto border border-[var(--line)] bg-[var(--background)] p-4 text-xs leading-5 text-[var(--foreground)]">
                <code>{snippetCode}</code>
              </pre>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
