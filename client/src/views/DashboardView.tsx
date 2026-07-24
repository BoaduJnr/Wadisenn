import { CumulativeChart } from "../components/CumulativeChart";
import { MonthPicker } from "../components/MonthPicker";
import { ProgressBar } from "../components/ProgressBar";
import { SavingsHistoryChart } from "../components/SavingsHistoryChart";
import { StatTile } from "../components/StatTile";
import { useMonthHistory } from "../hooks/useMonthHistory";
import { useSummary } from "../hooks/useSummary";
import { formatCurrency } from "../lib/format";

export function DashboardView({
  month,
  currency,
  onMonthChange,
}: {
  month: string;
  currency: string;
  onMonthChange: (month: string) => void;
}) {
  const { summary, loading, error } = useSummary(month);
  const { summaries: history } = useMonthHistory();

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-24 max-w-md mx-auto">
      <MonthPicker month={month} onChange={onMonthChange} />

      {loading && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="text-sm text-center py-8" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Income" value={formatCurrency(summary.income.total, currency)} />
            <StatTile label="Spent" value={formatCurrency(summary.totalSpent, currency)} accent="var(--series-1)" />
            <StatTile
              label="Remaining"
              value={formatCurrency(summary.remaining, currency)}
              accent={summary.remaining < 0 ? "var(--status-critical)" : "var(--status-good)"}
            />
          </div>

          <ProgressBar spent={summary.totalSpent} income={summary.income.total} />

          {summary.isCurrentMonth && summary.projectedRemaining !== null && (
            <div
              className="rounded-2xl border p-4 flex items-start gap-3"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--series-1)"
                strokeWidth={2}
                className="shrink-0 mt-0.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Projected at this pace
                </span>
                <span
                  className="text-base font-semibold tabular-nums"
                  style={{ color: summary.projectedRemaining < 0 ? "var(--status-critical)" : "var(--text-primary)" }}
                >
                  {formatCurrency(summary.projectedRemaining, currency)} left by month end
                </span>
              </div>
            </div>
          )}

          <CumulativeChart summary={summary} currency={currency} />

          {summary.income.addOns.length > 0 && (
            <div
              className="rounded-2xl border p-4 flex flex-col gap-2"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Add-ons this month
              </h3>
              {summary.income.addOns.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{a.label}</span>
                  <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(a.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <SavingsHistoryChart summaries={history} currency={currency} />
        </>
      )}
    </div>
  );
}
