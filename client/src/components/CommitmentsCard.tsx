import { categoryColor } from "../lib/categories";
import { monthNameShort } from "../lib/format";
import type { Money } from "../lib/money";
import type { CommitmentCharge, MonthCommitments } from "../types";

/** How a single charge got to this month, said in as few words as possible. */
function chargeNote(charge: CommitmentCharge): string {
  if (charge.cadence === "monthly") {
    return charge.dueDay ? `Every month, day ${charge.dueDay}` : "Every month";
  }
  if (charge.reserved) return "Yearly cost, a twelfth reserved";
  return charge.dueMonth ? `Yearly, due in ${monthNameShort(charge.dueMonth)}` : "Yearly";
}

export function CommitmentsCard({
  commitments,
  money,
  onManage,
}: {
  commitments: MonthCommitments;
  money: Money;
  onManage: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Fixed this month
        </h3>
        <span className="font-display text-sm font-bold tabular-nums" style={{ color: "var(--tone-fixed)" }}>
          {money.format(commitments.total)}
        </span>
      </div>

      {commitments.charges.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Nothing fixed yet. Add your rent, utilities and yearly renewals and Wadisenn will take them out of
          every month before counting a single day of spending.
        </p>
      ) : (
        <div className="flex flex-col">
          {commitments.charges.map((charge, i) => (
            <div
              key={charge.id}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: categoryColor(charge.category) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {charge.label}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--muted)" }}>
                  {chargeNote(charge)}
                </div>
              </div>
              <span
                className="shrink-0 text-sm font-semibold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {money.format(charge.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onManage}
        className="h-10 rounded-lg border font-display text-sm font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--brand)" }}
      >
        {commitments.charges.length === 0 ? "Set up fixed costs" : "Manage fixed costs"}
      </button>
    </div>
  );
}
