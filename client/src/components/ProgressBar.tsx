export function ProgressBar({ spent, income }: { spent: number; income: number }) {
  const ratio = income > 0 ? spent / income : spent > 0 ? 1 : 0;
  const overBudget = ratio > 1;
  const widthPct = Math.min(ratio, 1) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "var(--gridline)" }}
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${widthPct}%`,
            background: overBudget ? "var(--status-critical)" : "var(--series-1)",
          }}
        />
      </div>
      {overBudget && (
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--status-critical)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
          <span>Over budget this month</span>
        </div>
      )}
    </div>
  );
}
