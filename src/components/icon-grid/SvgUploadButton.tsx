"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IconMeta } from "../../../types/icon";
import { hasVisibleStroke, normalizeSvg } from "@/lib/icons/normalize-svg";
import { useProjectStore } from "@/lib/state/project-store";
import { createDraftId } from "@/lib/workshop/sequences";

const MAX_FILE_SIZE = 1024 * 1024;

function fileNameToIconName(fileName: string) {
  return fileName.replace(/\.svg$/i, "").trim() || "uploaded-svg";
}

export default function SvgUploadButton() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const setIcon = useProjectStore((state) => state.setIcon);
  const setAnimationId = useProjectStore((state) => state.setAnimationId);
  const setDurationMs = useProjectStore((state) => state.setDurationMs);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type && file.type !== "image/svg+xml" && !file.name.toLowerCase().endsWith(".svg")) {
      setStatus("Upload an SVG file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus("SVG must be under 1MB.");
      return;
    }

    try {
      const svgRaw = await file.text();
      if (!svgRaw.includes("<svg")) {
        setStatus("That file does not look like an SVG.");
        return;
      }

      const isStrokeBased = hasVisibleStroke(svgRaw);
      const normalized = normalizeSvg(svgRaw, true);
      if (normalized.paths.length === 0) {
        setStatus("No animatable paths found.");
        return;
      }

      const icon: IconMeta = {
        id: `custom:${file.name}:${file.lastModified}`,
        name: fileNameToIconName(file.name),
        library: "custom",
        tags: ["uploaded", "custom"],
        viewBox: normalized.viewBox,
        isStrokeBased,
        svgRaw,
        paths: normalized.paths,
      };

      setIcon(icon);
      setAnimationId(isStrokeBased ? "draw-on" : "fade-in");
      setDurationMs(isStrokeBased ? 1200 : 700);
      setStatus(null);
      router.push(`/workshop/${createDraftId()}`);
    } catch {
      setStatus("Could not read that SVG.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-sp-5">
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-sp-9 items-center rounded-sm border border-[var(--line-strong)] bg-[var(--control)] px-sp-5 text-label-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        Upload SVG
      </button>
      {status && <p className="hidden text-label-xs text-[var(--accent)] sm:block">{status}</p>}
    </div>
  );
}
