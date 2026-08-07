"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import Select from "@/components/ui/Select";

type ColorFormat = "hex" | "rgb" | "hsl";

const FORMATS: Array<{ id: ColorFormat; label: string }> = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "hsl", label: "HSL" },
];

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const parsed = Number.parseInt(normalized, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(lightness * 100) };

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === red
      ? (green - blue) / delta + (green < blue ? 6 : 0)
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;

  return {
    h: Math.round(hue * 60),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function hslToHex(h: number, s: number, l: number) {
  const hue = (((h % 360) + 360) % 360) / 360;
  const saturation = Math.max(0, Math.min(100, s)) / 100;
  const lightness = Math.max(0, Math.min(100, l)) / 100;

  if (saturation === 0) {
    const value = Math.round(lightness * 255);
    return rgbToHex(value, value, value);
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let adjusted = t;
    if (adjusted < 0) adjusted += 1;
    if (adjusted > 1) adjusted -= 1;
    if (adjusted < 1 / 6) return p + (q - p) * 6 * adjusted;
    if (adjusted < 1 / 2) return q;
    if (adjusted < 2 / 3) return p + (q - p) * (2 / 3 - adjusted) * 6;
    return p;
  };

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return rgbToHex(
    Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, hue) * 255),
    Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  );
}

function formatColor(color: string, format: ColorFormat) {
  const { r, g, b } = hexToRgb(color);
  if (format === "rgb") return `${r}, ${g}, ${b}`;
  if (format === "hsl") {
    const { h, s, l } = rgbToHsl(r, g, b);
    return `${h}, ${s}%, ${l}%`;
  }
  return color.toUpperCase();
}

function parseColor(value: string, format: ColorFormat) {
  const trimmed = value.trim();
  if (format === "hex") {
    const match = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1];
    return `#${hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex}`.toLowerCase();
  }

  const numbers = trimmed.match(/-?\d+(\.\d+)?/g)?.map(Number);
  if (!numbers || numbers.length < 3) return null;

  if (format === "rgb") {
    const [r, g, b] = numbers;
    if ([r, g, b].some((channel) => channel < 0 || channel > 255)) return null;
    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
  }

  const [h, s, l] = numbers;
  if (s < 0 || s > 100 || l < 0 || l > 100) return null;
  return hslToHex(h, s, l);
}

export default function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const formattedValue = formatColor(color, format);

  useEffect(() => {
    if (!open) return;

    const positionPopover = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPopoverPos({ top: rect.bottom + 8, left: rect.left });
    };
    positionPopover();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-sp-5">
      <span className="text-label-xs font-medium text-[var(--muted)]">Color</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Choose color"
        aria-expanded={open}
        className="h-sp-9 w-sp-9 shrink-0 rounded-full border-2 border-[var(--line-strong)] shadow-[var(--shadow-xs)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
        style={{ backgroundColor: color }}
      />

      {open && (
        <div
          ref={popoverRef}
          style={{ top: popoverPos.top, left: popoverPos.left }}
          className="fixed z-[80] flex w-64 flex-col gap-sp-4 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-sp-5 shadow-[var(--shadow-lg)]"
        >
          <HexColorPicker color={color} onChange={onChange} className="blick-color-picker" style={{ width: "100%" }} />
          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-sp-4">
            <Select value={format} onChange={(value) => setFormat(value as ColorFormat)} ariaLabel="Color format">
              {FORMATS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <input
              key={`${format}-${color}`}
              defaultValue={formattedValue}
              onChange={(event) => {
                const nextColor = parseColor(event.target.value, format);
                if (nextColor) onChange(nextColor);
              }}
              className="min-h-sp-10 min-w-0 rounded-sm border border-[var(--line-strong)] bg-[var(--background)] px-sp-4 text-label-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label={`${format.toUpperCase()} color value`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
