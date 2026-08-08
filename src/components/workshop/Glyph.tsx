export type GlyphName =
  | "play"
  | "pause"
  | "reset"
  | "loop"
  | "once"
  | "copy"
  | "trash"
  | "auto"
  | "hover"
  | "leave"
  | "forward"
  | "backward"
  | "center"
  | "reverse"
  | "undo"
  | "redo"
  | "user"
  | "cloud"
  | "close"
  | "shield"
  | "edit";

export default function Glyph({
  name,
  className = "h-sp-6 w-sp-6",
}: {
  name: GlyphName;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "play") return <svg {...common}><path d="M8 5v14l11-7z" /></svg>;
  if (name === "pause") return <svg {...common}><path d="M8 5v14" /><path d="M16 5v14" /></svg>;
  if (name === "reset") return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" /></svg>;
  if (name === "loop") return <svg {...common}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  if (name === "once") return <svg {...common}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
  if (name === "copy") return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M4 16V5a1 1 0 0 1 1-1h11" /></svg>;
  if (name === "trash") return <svg {...common}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></svg>;
  if (name === "auto") return <svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
  if (name === "hover") return <svg {...common}><path d="M9 4v9l-2-2a2 2 0 0 0-3 3l5 6h7l3-7" /><path d="M13 4v8" /></svg>;
  if (name === "leave") return <svg {...common}><path d="M9 4v9l-2-2a2 2 0 0 0-3 3l5 6h7l3-7" /><path d="M15 5l4 4-4 4" /></svg>;
  if (name === "forward") return <svg {...common}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
  if (name === "backward") return <svg {...common}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>;
  if (name === "center") return <svg {...common}><path d="M4 12h6" /><path d="M14 12h6" /><path d="M10 8l4 4-4 4" /><path d="M14 8l-4 4 4 4" /></svg>;
  if (name === "reverse") return <svg {...common}><path d="M7 7h10v4" /><path d="M17 17H7v-4" /><path d="M17 7l-4-4" /><path d="M7 17l4 4" /></svg>;
  if (name === "undo") return <svg {...common}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-2" /></svg>;
  if (name === "redo") return <svg {...common}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h2" /></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
  if (name === "cloud") return <svg {...common}><path d="M7 18h11a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.7 9.1 4.5 4.5 0 0 0 7 18z" /></svg>;
  if (name === "close") return <svg {...common}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>;
  if (name === "edit") return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
  return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}
