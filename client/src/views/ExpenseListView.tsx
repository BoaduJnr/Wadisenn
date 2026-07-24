import { useState } from "react";
import { deleteExpense, updateExpense } from "../api";
import { BottomSheet } from "../components/BottomSheet";
import { ExpenseForm, type ExpenseFormValues } from "../components/ExpenseForm";
import { ExpenseListItem } from "../components/ExpenseListItem";
import { MonthPicker } from "../components/MonthPicker";
import { useExpenses } from "../hooks/useExpenses";
import { dayLabel, formatCurrency } from "../lib/format";
import type { Expense } from "../types";

export function ExpenseListView({
  month,
  currency,
  onMonthChange,
  onChanged,
}: {
  month: string;
  currency: string;
  onMonthChange: (month: string) => void;
  onChanged: () => void;
}) {
  const { expenses, loading, error, refetch } = useExpenses(month);
  const [editing, setEditing] = useState<Expense | null>(null);

  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const list = groups.get(e.date) ?? [];
    list.push(e);
    groups.set(e.date, list);
  }
  const days = [...groups.keys()].sort().reverse();

  async function handleSave(values: ExpenseFormValues) {
    if (!editing) return;
    await updateExpense(month, editing.id, values);
    refetch();
    onChanged();
    setEditing(null);
  }

  async function handleDelete() {
    if (!editing) return;
    await deleteExpense(month, editing.id);
    refetch();
    onChanged();
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-2 px-4 pt-2 pb-24 max-w-md mx-auto">
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
      {!loading && !error && expenses.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: "var(--text-secondary)" }}>
          No expenses logged this month yet.
        </p>
      )}

      {days.map((date) => {
        const dayExpenses = groups.get(date)!;
        const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
        return (
          <div
            key={date}
            className="rounded-2xl border px-3 py-1"
            style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {dayLabel(date)}
              </span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--muted)" }}>
                {formatCurrency(dayTotal, currency)}
              </span>
            </div>
            {dayExpenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                currency={currency}
                onClick={() => setEditing(expense)}
              />
            ))}
          </div>
        );
      })}

      {editing && (
        <BottomSheet onClose={() => setEditing(null)}>
          <ExpenseForm initial={editing} onSave={handleSave} onDelete={handleDelete} />
        </BottomSheet>
      )}
    </div>
  );
}
