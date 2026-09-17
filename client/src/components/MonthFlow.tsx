import type { Money } from "../lib/money";
import type { MonthSummary } from "../types";

type Row = {
  label: string;
  amount: number;
  /** Shown with a leading minus and read as money going out. */
  deduction?: boolean;
  /** Ruled off above and set in the display face, as a running total. */
  subtotal?: boolean;
  tone?: string;
  hint?: string;
};

/**
 * The month as a statement rather than a grid of tiles: income at the top,
 * every deduction in the order it applies, and two ruled subtotals — what was
 * spendable once the fixed costs were taken out, and what is left of it.
 */
export function MonthFlow({ summary, money }: { summary: MonthSummary; money: Money }) {
  const { income, commitments, budget, totalSpent, remaining } = summary;

  const rows: Row[] = [{ label: "Income", amount: income.total, hint: incomeHint(summary) }];

  if (commitments.monthlyTotal > 0) {
    rows.push({ label: "Fixed monthly", amount: commitments.monthlyTotal, deduction: true });
  }
  if (commitments.yearlyTotal > 0) {
    rows.push({ label: "Fixed yearly", amount: commitments.yearlyTotal, deduction: true });
  }

  rows.push({
    label: "Spendable",
    amount: budget,
    subtotal: true,
    tone: budget < 0 ? "var(--status-critical)" : undefined,
    hint: commitments.total > 0 ? "After fixed costs" : "Nothing fixed set up yet",
  });

  rows.push({ label: "Spent so far", amount: totalSpent, deduction: true });

  rows.push({
    label: "Left",
    amount: remaining,
    subtotal: true,
    tone: remaining < 0 ? "var(--status-critical)" : "var(--status-good)",
  });

  return (
    <div
      className="flex flex-col rounded-xl border px-4 py-1"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-baseline justify-between gap-3 py-2.5 ${row.subtotal ? "subtotal-rule" : ""}`}
        >
          <div className="flex min-w-0 flex-col">
            <span
              className={row.subtotal ? "font-display text-sm font-bold" : "text-sm"}
              style={{ color: row.subtotal ? "var(--text-primary)" : "var(--text-secondary)" }}
            >
              {row.label}
            </span>
            {row.hint && (
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                {row.hint}
              </span>
            )}
          </div>
          <span
            className={`shrink-0 tabular-nums ${
              row.subtotal ? "font-display text-base font-bold" : "text-sm font-medium"
            }`}
            style={{ color: row.tone ?? (row.deduction ? "var(--text-secondary)" : "var(--text-primary)") }}
          >
            {row.deduction ? "− " : ""}
            {money.format(Math.abs(row.amount))}
          </span>
        </div>
      ))}
    </div>
  );
}

function incomeHint(summary: MonthSummary): string | undefined {
  const count = summary.income.addOns.length;
  if (count === 0) return undefined;
  return `Salary plus ${count} one-off${count === 1 ? "" : "s"}`;
}
