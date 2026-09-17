import { useState, type FormEvent } from "react";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import { todayDateString } from "../lib/format";
import type { Expense } from "../types";

export interface ExpenseFormValues {
  date: string;
  amount: number;
  category: string;
  note?: string;
}

export function ExpenseForm({
  base,
  initial,
  submitLabel,
  onSave,
  onSaved,
  onDelete,
}: {
  /** Currency amounts are stored in — shown so entry is never ambiguous. */
  base: string;
  initial?: Expense | null;
  submitLabel?: string;
  onSave: (values: ExpenseFormValues) => Promise<void>;
  onSaved?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [date, setDate] = useState(initial?.date ?? todayDateString());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category ?? EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ date, amount: parsedAmount, category, note: note || undefined });
      if (!isEdit) {
        setAmount("");
        setNote("");
        setDate(todayDateString());
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        {isEdit ? "Edit spend" : "Log a spend"}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Amount ({base})
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-12 rounded-lg border px-3 font-display text-lg font-bold tabular-nums"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Category
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-lg border px-3"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Date
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-lg border px-3"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Note (optional)
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Groceries at the market"
          className="h-11 rounded-lg border px-3"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
      </label>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="h-12 rounded-lg font-display font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--on-brand)" }}
      >
        {submitLabel ?? (isEdit ? "Save changes" : "Log it")}
      </button>

      {isEdit && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="h-11 rounded-lg font-display font-medium disabled:opacity-60"
          style={{ color: "var(--status-critical)" }}
        >
          Delete this spend
        </button>
      )}
    </form>
  );
}
