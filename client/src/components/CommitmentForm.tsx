import { useState, type FormEvent, type ReactNode } from "react";
import type { CommitmentInput } from "../api";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import { currentMonthString, monthNameShort } from "../lib/format";
import type { Cadence, Commitment } from "../types";

const FIELD_CLASS = "h-11 rounded-lg border px-3";
const FIELD_STYLE = {
  borderColor: "var(--border)",
  color: "var(--text-primary)",
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function CommitmentForm({
  base,
  initial,
  onSave,
  onDelete,
}: {
  /** Currency amounts are stored in — shown so entry is never ambiguous. */
  base: string;
  initial?: Commitment | null;
  onSave: (values: CommitmentInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? "monthly");
  const [category, setCategory] = useState(initial?.category ?? "Bills");
  const [dueDay, setDueDay] = useState(initial?.dueDay ? String(initial.dueDay) : "");
  const [dueMonth, setDueMonth] = useState(String(initial?.dueMonth ?? new Date().getMonth() + 1));
  const [spread, setSpread] = useState(Boolean(initial?.spread));
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? currentMonthString());
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!label.trim()) {
      setError("Give it a name, like Rent or Internet");
      return;
    }
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (!startMonth) {
      setError("Pick the month this starts from");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        label: label.trim(),
        amount: parsedAmount,
        cadence,
        category,
        startMonth,
        endMonth: endMonth || undefined,
        ...(cadence === "monthly"
          ? { dueDay: dueDay ? Number(dueDay) : undefined }
          : { dueMonth: Number(dueMonth), spread }),
      });
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
        {isEdit ? "Edit fixed cost" : "New fixed cost"}
      </h2>

      <div className="grid grid-cols-2 gap-2">
        {(["monthly", "yearly"] as Cadence[]).map((option) => {
          const active = cadence === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setCadence(option)}
              aria-pressed={active}
              className="h-11 rounded-lg border font-display text-sm font-semibold capitalize"
              style={{
                borderColor: active ? "var(--brand)" : "var(--border)",
                background: active ? "var(--brand-soft)" : "transparent",
                color: active ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      <Field label="Name">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={cadence === "monthly" ? "e.g. Rent" : "e.g. Car insurance"}
          className={FIELD_CLASS}
          style={FIELD_STYLE}
        />
      </Field>

      <div className="flex gap-2">
        <Field label={cadence === "monthly" ? `Amount each month (${base})` : `Amount each year (${base})`}>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`${FIELD_CLASS} font-display font-bold tabular-nums`}
            style={FIELD_STYLE}
          />
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {cadence === "monthly" ? (
        <Field label="Day of the month (optional)">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="e.g. 1"
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </Field>
      ) : (
        <>
          <Field label="Month it falls due">
            <select
              value={dueMonth}
              onChange={(e) => setDueMonth(e.target.value)}
              className={FIELD_CLASS}
              style={FIELD_STYLE}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthNameShort(m)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={spread}
              onChange={(e) => setSpread(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded"
              style={{ accentColor: "var(--brand)" }}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Spread it over twelve months
              </span>
              <span className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
                Hold back a twelfth every month instead of taking the whole amount out of{" "}
                {monthNameShort(Number(dueMonth))}.
              </span>
            </span>
          </label>
        </>
      )}

      <div className="flex gap-2">
        <Field label="Starts">
          <input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </Field>
        <Field label="Ends (optional)">
          <input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </Field>
      </div>

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
        {isEdit ? "Save changes" : "Add fixed cost"}
      </button>

      {isEdit && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="h-11 rounded-lg font-display font-medium disabled:opacity-60"
          style={{ color: "var(--status-critical)" }}
        >
          Remove this fixed cost
        </button>
      )}
    </form>
  );
}
