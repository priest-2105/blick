"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";

type ColorFormat = "hex" | "rgb" | "hsl";

const PRESETS = ["#f5f5d1", "#d9ff00", "#ffffff", "#ff4f88", "#45d7ff", "#11130f", "#7affb2"];
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
  const formattedValue = formatColor(color, format);

  return (
    <div className="flex flex-col gap-3 text-[var(--foreground)]">
      <HexColorPicker
        color={color}
        onChange={onChange}
        className="blick-color-picker"
        style={{ width: "100%" }}
      />
      <div className="grid grid-cols-[92px_minmax(0,1fr)_48px] gap-2">
        <select
          value={format}
          onChange={(event) => setFormat(event.target.value as ColorFormat)}
          className="min-h-9 border border-[var(--line-strong)] bg-[var(--control)] px-2 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Color format"
        >
          {FORMATS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          key={`${format}-${color}`}
          defaultValue={formattedValue}
          onChange={(event) => {
            const nextColor = parseColor(event.target.value, format);
            if (nextColor) onChange(nextColor);
          }}
          className="min-h-9 min-w-0 border border-[var(--line-strong)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label={`${format.toUpperCase()} color value`}
        />
        <div
          className="h-9 border border-[var(--line-strong)]"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">
        {format.toUpperCase()} value: {formattedValue}
      </p>
      <div className="grid grid-cols-7 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`h-8 border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
              color.toLowerCase() === preset.toLowerCase()
                ? "border-[var(--accent)]"
                : "border-[var(--line)]"
            }`}
            style={{ backgroundColor: preset }}
            aria-label={preset}
          />
        ))}
      </div>
    </div>
  );
}
