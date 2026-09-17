export function StatTile({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-3.5"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span
        className="font-display text-lg font-bold tabular-nums"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}
