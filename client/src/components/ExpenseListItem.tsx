import { categoryColor } from "../lib/categories";
import type { Money } from "../lib/money";
import type { Expense } from "../types";

export function ExpenseListItem({
  expense,
  money,
  onClick,
}: {
  expense: Expense;
  money: Money;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-1 text-left border-b last:border-b-0 active:opacity-70"
      style={{ borderColor: "var(--border)" }}
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ background: categoryColor(expense.category) }}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {expense.category}
        </div>
        {expense.note && (
          <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
            {expense.note}
          </div>
        )}
      </div>
      <span className="font-display text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {money.format(expense.amount)}
      </span>
    </button>
  );
}
