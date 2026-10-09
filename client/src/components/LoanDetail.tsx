import { useState, type FormEvent } from "react";
import { dayLabel, todayDateString } from "../lib/format";
import { loanBalance } from "../lib/loans";
import type { Money } from "../lib/money";
import type { Loan } from "../types";

const FIELD_CLASS = "h-11 rounded-lg border px-3";
const FIELD_STYLE = {
  borderColor: "var(--border)",
  color: "var(--text-primary)",
} as const;

/** How much of a loan has come back, as a bar. */
export function RepaidBar({ repaid, amount }: { repaid: number; amount: number }) {
  const share = amount > 0 ? Math.min(repaid / amount, 1) : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: "var(--gridline)" }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${share * 100}%`, background: share >= 1 ? "var(--status-good)" : "var(--brand)" }}
      />
    </div>
  );
}

/**
 * One loan opened up: where it stands, every repayment against it, and a
 * quick way to record the next one.
 */
export function LoanDetail({
  loan,
  money,
  onRepay,
  onRemoveRepayment,
  onEdit,
}: {
  loan: Loan;
  money: Money;
  onRepay: (repayment: { amount: number; date: string; note?: string }) => Promise<void>;
  onRemoveRepayment: (repaymentId: string) => Promise<void>;
  onEdit: () => void;
}) {
  const today = todayDateString();
  const { repaid, outstanding, settled, overdue } = loanBalance(loan, today);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleRepay(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!amount || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (parsed > outstanding) {
      setError(`Only ${money.format(outstanding)} is still owed`);
      return;
    }
    await run(async () => {
      await onRepay({ amount: parsed, date });
      setAmount("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {loan.person}
          </h2>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Lent {money.format(loan.amount)} on {dayLabel(loan.date)}
          </p>
          {loan.note && (
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {loan.note}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--brand)" }}
        >
          Edit
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {settled ? "Fully repaid" : "Still owed"}
          </span>
          <span
            className="font-display text-xl font-bold tabular-nums"
            style={{ color: settled ? "var(--status-good)" : "var(--text-primary)" }}
          >
            {money.format(outstanding)}
          </span>
        </div>
        <RepaidBar repaid={repaid} amount={loan.amount} />
        <div className="flex justify-between text-[11px]" style={{ color: "var(--muted)" }}>
          <span>{money.format(repaid)} back</span>
          {loan.dueDate && (
            <span style={{ color: overdue ? "var(--status-critical)" : undefined }}>
              {overdue ? "Overdue since" : "Due"} {dayLabel(loan.dueDate)}
            </span>
          )}
        </div>
      </div>

      {!settled && (
        <form onSubmit={handleRepay} className="flex flex-col gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Record a repayment
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Repayment amount"
              className={`${FIELD_CLASS} min-w-0 flex-1 font-display font-bold tabular-nums`}
              style={FIELD_STYLE}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Repayment date"
              className={`${FIELD_CLASS} min-w-0 flex-1`}
              style={FIELD_STYLE}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAmount(String(outstanding))}
              className="h-11 rounded-lg border font-display text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Paid in full
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-11 rounded-lg font-display text-sm font-semibold disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--on-brand)" }}
            >
              Record
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Repayments
        </span>
        {loan.repayments.length === 0 ? (
          <p className="py-2 text-xs" style={{ color: "var(--muted)" }}>
            Nothing paid back yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {loan.repayments.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
              >
                <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                  {dayLabel(r.date)}
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {money.format(r.amount)}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => onRemoveRepayment(r.id))}
                  aria-label={`Remove repayment of ${money.format(r.amount)} on ${dayLabel(r.date)}`}
                  className="grid h-8 w-8 place-items-center rounded-md disabled:opacity-60"
                  style={{ color: "var(--muted)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
