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
      className="rounded-2xl border p-4 flex flex-col gap-1"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums" style={{ color: accent ?? "var(--text-primary)" }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}
