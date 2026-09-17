import type { ReactNode } from "react";
import { navigate } from "../../lib/navigation";

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-extrabold"
        style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        aria-hidden
      >
        W
      </span>
      <span
        className="font-display text-lg font-bold tracking-tight"
        style={{ color: onDark ? "var(--ink-text)" : "var(--text-primary)" }}
      >
        Wadisenn<span style={{ color: "var(--brand)" }}>.</span>
      </span>
    </span>
  );
}

export function OpenAppButton({
  children = "Open Wadisenn",
  variant = "primary",
  size = "md",
}: {
  children?: ReactNode;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
}) {
  const height = size === "sm" ? "h-10 px-4 text-sm" : size === "lg" ? "h-14 px-7 text-base" : "h-12 px-6 text-sm";
  const palette =
    variant === "primary"
      ? { background: "var(--brand)", color: "var(--on-brand)", borderColor: "var(--brand)" }
      : { background: "transparent", color: "currentColor", borderColor: "var(--border)" };

  return (
    <button
      type="button"
      onClick={() => navigate("/app")}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-display font-semibold transition-transform active:scale-[0.98] ${height}`}
      style={palette}
    >
      {children}
    </button>
  );
}

export function AnchorButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg border px-6 font-display text-sm font-semibold"
      style={{ borderColor: "var(--border)", color: "currentColor" }}
    >
      {children}
    </a>
  );
}

export function Check({ tone = "brand" }: { tone?: "brand" | "good" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={tone === "brand" ? "var(--brand)" : "var(--status-good)"}
      strokeWidth={2.6}
      className="mt-0.5 shrink-0"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

/** A section label: an accent rule and small caps, in place of a pill chip. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2.5 font-display text-[11px] font-bold tracking-[0.14em] uppercase"
      style={{ color: "var(--brand)" }}
    >
      <span className="h-0.5 w-6 rounded-full" style={{ background: "var(--brand)" }} aria-hidden />
      {children}
    </span>
  );
}

/** A large outlined numeral, used to number the steps of a month. */
export function StepNumber({ n }: { n: number }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border font-display text-sm font-extrabold tabular-nums"
      style={{ borderColor: "var(--brand)", color: "var(--brand)", background: "var(--brand-soft)" }}
      aria-hidden
    >
      {n}
    </span>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <Check />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Soft violet glow used behind the deep indigo hero and CTA bands. */
export function Glow({
  className,
  opacity = 0.32,
  size = 420,
}: {
  className?: string;
  opacity?: number;
  size?: number;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-2xl ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(124,92,245,${opacity}), transparent 65%)`,
      }}
    />
  );
}
