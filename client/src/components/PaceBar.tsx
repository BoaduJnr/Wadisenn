import type { BudgetPace, PaceStatus } from "../../../shared/pace.ts";
import type { Money } from "../lib/money";

/**
 * The month's target, and whether spending is outrunning the calendar.
 *
 * The bar carries two things at once: the fill is how much of the target is
 * gone, and the marker is how much of the *month* is gone. Fill behind the
 * marker means there is slack; fill past it means the money is going faster
 * than the days are.
 */

const TONE: Record<PaceStatus, string> = {
  "no-target": "var(--muted)",
  under: "var(--status-good)",
  on: "var(--brand)",
  over: "var(--status-warning)",
  exhausted: "var(--status-critical)",
};

const LABEL: Record<PaceStatus, string> = {
  "no-target": "No budget set",
  under: "Under pace",
  on: "On pace",
  over: "Spending too fast",
  exhausted: "Target spent",
};

/** The headline sentence, which differs for a month that has finished. */
function summarise(pace: BudgetPace, money: Money): string {
  const { status, variance, remaining, daysLeft } = pace;

  // Outside the current month there is no pace to speak of, only the outcome.
  if (daysLeft === null) {
    if (status === "exhausted") return `${money.format(Math.abs(remaining))} over target`;
    return `${money.format(remaining)} under target`;
  }

  if (status === "no-target") return "Set a target to track your pace";
  if (status === "exhausted") {
    return remaining < 0
      ? `${money.format(Math.abs(remaining))} past the target, ${daysLeft} days still to go`
      : "The whole target is spent";
  }
  if (variance === null) return "";
  if (status === "on") return "Spending in step with the month";
  return variance > 0
    ? `${money.format(variance)} ahead of pace`
    : `${money.format(Math.abs(variance))} behind pace, with room to spare`;
}

export function PaceBar({ pace, money }: { pace: BudgetPace; money: Money }) {
  const tone = TONE[pace.status];
  const fillPct = Math.min(Math.max(pace.used, 0), 1) * 100;
  const markerPct = pace.elapsed === null ? null : Math.min(Math.max(pace.elapsed, 0), 1) * 100;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {money.format(pace.target)} target
          </span>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            {pace.source === "month"
              ? "Set for this month"
              : pace.source === "default"
              ? "Your default monthly target"
              : "Your whole spendable budget"}
          </span>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-1 font-display text-[11px] font-bold"
          style={{ background: "var(--brand-soft)", color: tone }}
        >
          {LABEL[pace.status]}
        </span>
      </div>

      <div className="relative">
        <div className="h-2.5 overflow-hidden rounded-sm" style={{ background: "var(--gridline)" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${fillPct}%`, background: tone }}
            role="progressbar"
            aria-valuenow={Math.round(pace.used * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Target budget used"
          />
        </div>

        {/* Where an even spend would have reached by today. */}
        {markerPct !== null && (
          <div
            className="pointer-events-none absolute -top-1 h-4.5 w-0.5 rounded-full"
            style={{ left: `calc(${markerPct}% - 1px)`, background: "var(--text-primary)", height: "1.125rem" }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-medium" style={{ color: tone }}>
          {summarise(pace, money)}
        </span>
        {pace.daysLeft !== null && pace.status !== "no-target" && (
          <span className="text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {pace.remaining > 0
              ? `${money.format(pace.dailyAllowance ?? 0)}/day for ${pace.daysLeft} left`
              : `${pace.daysLeft} days left with nothing budgeted`}
          </span>
        )}
      </div>

      {pace.exhaustedOnDay !== null && pace.status === "over" && (
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
          At this rate the target runs out on day {pace.exhaustedOnDay} of {pace.daysInMonth}.
        </p>
      )}
    </div>
  );
}
