import { CommitmentsCard } from "../components/CommitmentsCard";
import { CumulativeChart } from "../components/CumulativeChart";
import { KeptAccumulationChart } from "../components/KeptAccumulationChart";
import { MonthFlow } from "../components/MonthFlow";
import { MonthHistoryChart } from "../components/MonthHistoryChart";
import { MonthPicker } from "../components/MonthPicker";
import { ProgressBar } from "../components/ProgressBar";
import { useMonthHistory } from "../hooks/useMonthHistory";
import { useSummary } from "../hooks/useSummary";
import type { Money } from "../lib/money";

export function DashboardView({
  month,
  money,
  onMonthChange,
  onManageFixed,
}: {
  month: string;
  money: Money;
  onMonthChange: (month: string) => void;
  onManageFixed: () => void;
}) {
  const { summary, loading, error } = useSummary(month);
  const { summaries: history } = useMonthHistory();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-2 pb-28">
      <MonthPicker month={month} onChange={onMonthChange} />

      {loading && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      {summary && (
        <>
          {/* The headline is what is free after fixed costs AND logged spending,
              which is the only figure that is safe to act on. */}
          <div
            className="flex flex-col gap-1 rounded-xl border-l-4 p-5"
            style={{
              background: "var(--surface-1)",
              borderColor: summary.remaining < 0 ? "var(--status-critical)" : "var(--brand)",
              borderTop: "1px solid var(--border)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Free to spend
              </span>
              {summary.isCurrentMonth && summary.today !== null && (
                <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Day {summary.today} of {summary.daysInMonth}
                </span>
              )}
            </div>
            <span
              className="font-display text-4xl font-extrabold tabular-nums"
              style={{ color: summary.remaining < 0 ? "var(--status-critical)" : "var(--text-primary)" }}
            >
              {money.format(summary.remaining)}
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {summary.commitments.total > 0
                ? `${money.format(summary.commitments.total)} fixed and ${money.format(
                    summary.totalSpent,
                  )} spent, out of ${money.format(summary.income.total)}`
                : `${money.format(summary.totalSpent)} spent of ${money.format(summary.income.total)}`}
            </span>
          </div>

          <MonthFlow summary={summary} money={money} />

          <ProgressBar spent={summary.totalSpent} budget={summary.budget} />

          {summary.isCurrentMonth && summary.projectedRemaining !== null && (
            <div
              className="flex items-start gap-3 rounded-xl border p-4"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                className="mt-0.5 shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  At this pace
                </span>
                <span
                  className="font-display text-base font-bold tabular-nums"
                  style={{ color: summary.projectedRemaining < 0 ? "var(--status-critical)" : "var(--text-primary)" }}
                >
                  {money.format(summary.projectedRemaining)} free by month end
                </span>
              </div>
            </div>
          )}

          <CommitmentsCard commitments={summary.commitments} money={money} onManage={onManageFixed} />

          <CumulativeChart summary={summary} money={money} />

          {summary.income.addOns.length > 0 && (
            <div
              className="flex flex-col gap-2 rounded-xl border p-4"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            >
              <h3 className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                One-off income
              </h3>
              {summary.income.addOns.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{a.label}</span>
                  <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {money.format(a.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <MonthHistoryChart summaries={history} money={money} />

          <KeptAccumulationChart summaries={history} money={money} />
        </>
      )}
    </div>
  );
}
