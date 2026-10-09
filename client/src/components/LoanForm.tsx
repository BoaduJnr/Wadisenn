import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { LoanInput } from "../api";
import { todayDateString } from "../lib/format";
import type { Loan } from "../types";

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

export function LoanForm({
  base,
  initial,
  people,
  onSave,
  onDelete,
}: {
  /** Currency amounts are stored in — shown so entry is never ambiguous. */
  base: string;
  initial?: Loan | null;
  /** Names already lent to, offered as suggestions so one person stays one group. */
  people: string[];
  onSave: (values: LoanInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [person, setPerson] = useState(initial?.person ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayDateString());
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peopleListId = useId();

  const isEdit = Boolean(initial);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!person.trim()) {
      setError("Who did you lend it to?");
      return;
    }
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (!date) {
      setError("Pick the date you lent it");
      return;
    }
    if (dueDate && dueDate < date) {
      setError("The payback date can't be before the date you lent it");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        person: person.trim(),
        amount: parsedAmount,
        date,
        // Null on edit so clearing a field actually clears what is stored.
        dueDate: dueDate || (isEdit ? null : undefined),
        note: note.trim() || (isEdit ? null : undefined),
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
        {isEdit ? "Edit loan" : "New loan"}
      </h2>

      <Field label="Lent to">
        <input
          type="text"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          placeholder="e.g. Kofi"
          list={peopleListId}
          autoComplete="off"
          className={FIELD_CLASS}
          style={FIELD_STYLE}
        />
        <datalist id={peopleListId}>
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>

      <Field label={`Amount (${base})`}>
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

      <div className="flex gap-2">
        <Field label="Lent on">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </Field>
        <Field label="Pay back by (optional)">
          <input
            type="date"
            value={dueDate}
            min={date}
            onChange={(e) => setDueDate(e.target.value)}
            className={FIELD_CLASS}
            style={FIELD_STYLE}
          />
        </Field>
      </div>

      <Field label="Note (optional)">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. School fees, to repay in two parts"
          className={FIELD_CLASS}
          style={FIELD_STYLE}
        />
      </Field>

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
        {isEdit ? "Save changes" : "Add loan"}
      </button>

      {isEdit && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="h-11 rounded-lg font-display font-medium disabled:opacity-60"
          style={{ color: "var(--status-critical)" }}
        >
          Remove this loan
        </button>
      )}
    </form>
  );
}
