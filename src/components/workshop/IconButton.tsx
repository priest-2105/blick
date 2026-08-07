import Glyph, { type GlyphName } from "./Glyph";

export default function IconButton({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: GlyphName;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid min-h-sp-10 min-w-sp-10 place-items-center rounded-sm border border-[var(--line-strong)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-[var(--active)] text-[var(--active-ink)]"
          : "bg-[var(--control)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
    >
      <Glyph name={icon} />
    </button>
  );
}
