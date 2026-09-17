/**
 * Progress is measured against the discretionary budget — income minus fixed
 * commitments — not against gross income, so the bar fills as the money that
 * was actually free to spend gets used up.
 */
export function ProgressBar({ spent, budget }: { spent: number; budget: number }) {
  const ratio = budget > 0 ? spent / budget : spent > 0 ? 1 : 0;
  const overBudget = ratio > 1;
  const widthPct = Math.min(ratio, 1) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-2 overflow-hidden rounded-sm"
        style={{ background: "var(--gridline)" }}
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${widthPct}%`,
            background: overBudget ? "var(--status-critical)" : "var(--accent)",
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: "var(--muted)" }}>
          {Math.round(ratio * 100)}% of the spendable budget used
        </span>
        {overBudget && (
          <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--status-critical)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              />
            </svg>
            Into the fixed money
          </span>
        )}
      </div>
    </div>
  );
}
