import { useMemo, useState } from "react";
import { addRepayment, createLoan, deleteLoan, deleteRepayment, updateLoan, type LoanInput } from "../api";
import { BottomSheet } from "../components/BottomSheet";
import { LoanDetail, RepaidBar } from "../components/LoanDetail";
import { LoanForm } from "../components/LoanForm";
import { StatTile } from "../components/StatTile";
import { useLoans } from "../hooks/useLoans";
import { round2 } from "../lib/commitments";
import { dayLabel, todayDateString } from "../lib/format";
import { loanBalance, loansByPerson, type PersonLoans } from "../lib/loans";
import type { Money } from "../lib/money";
import type { Loan } from "../types";

type Sheet = { mode: "add" } | { mode: "detail"; id: string } | { mode: "edit"; id: string };

function LoanRow({ loan, money, today, onClick }: { loan: Loan; money: Money; today: string; onClick: () => void }) {
  const { repaid, outstanding, settled, overdue } = loanBalance(loan, today);

  let note = `Lent ${dayLabel(loan.date)}`;
  if (settled) note += " · repaid";
  else if (repaid > 0) note += ` · ${money.format(repaid)} of ${money.format(loan.amount)} back`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1.5 border-b px-1 py-3 text-left last:border-b-0 active:opacity-70"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex w-full items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {money.format(loan.amount)}
            {loan.note && (
              <span className="font-normal" style={{ color: "var(--muted)" }}>
                {" "}
                · {loan.note}
              </span>
            )}
          </div>
          <div className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {note}
            {loan.dueDate && !settled && (
              <span style={{ color: overdue ? "var(--status-critical)" : undefined }}>
                {" "}
                · {overdue ? "overdue since" : "due"} {dayLabel(loan.dueDate)}
              </span>
            )}
          </div>
        </div>
        <span
          className="font-display text-sm font-bold tabular-nums"
          style={{ color: settled ? "var(--status-good)" : "var(--text-primary)" }}
        >
          {settled ? "Settled" : money.format(outstanding)}
        </span>
      </div>
      {!settled && repaid > 0 && <RepaidBar repaid={repaid} amount={loan.amount} />}
    </button>
  );
}

function PersonCard({
  group,
  money,
  today,
  onOpen,
}: {
  group: PersonLoans;
  money: Money;
  today: string;
  onOpen: (loan: Loan) => void;
}) {
  const settled = group.outstanding === 0;
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", opacity: settled ? 0.75 : 1 }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="truncate font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {group.person}
          {group.overdue && (
            <span
              className="ml-2 rounded px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: "var(--status-critical)", color: "#ffffff" }}
            >
              Overdue
            </span>
          )}
        </h2>
        <span
          className="shrink-0 text-xs font-semibold tabular-nums"
          style={{ color: settled ? "var(--status-good)" : "var(--text-secondary)" }}
        >
          {settled ? `All ${money.format(group.lent)} repaid` : `Owes ${money.format(group.outstanding)}`}
        </span>
      </div>
      <div className="flex flex-col">
        {group.loans.map((loan) => (
          <LoanRow key={loan.id} loan={loan} money={money} today={today} onClick={() => onOpen(loan)} />
        ))}
      </div>
    </div>
  );
}

export function LoansView({ money }: { money: Money }) {
  const { loans, loading, error, refetch } = useLoans();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const today = todayDateString();

  const groups = useMemo(() => loansByPerson(loans, today), [loans, today]);
  const owing = groups.filter((g) => g.outstanding > 0);
  const settled = groups.filter((g) => g.outstanding === 0);
  const outstandingTotal = round2(owing.reduce((sum, g) => sum + g.outstanding, 0));
  const repaidTotal = round2(groups.reduce((sum, g) => sum + g.repaid, 0));
  const overdueCount = owing.filter((g) => g.overdue).length;

  const open = sheet && sheet.mode !== "add" ? loans.find((l) => l.id === sheet.id) ?? null : null;
  const close = () => setSheet(null);

  async function handleCreate(values: LoanInput) {
    await createLoan(values);
    refetch();
    close();
  }

  async function handleUpdate(values: LoanInput) {
    if (!open) return;
    await updateLoan(open.id, values);
    refetch();
    // Back to the loan rather than the list, since the edit was made from there.
    setSheet({ mode: "detail", id: open.id });
  }

  async function handleDelete() {
    if (!open) return;
    await deleteLoan(open.id);
    refetch();
    close();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-safe pt-4 pb-nav">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          Money you've lent
        </h1>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Who has your money, how much, and what has come back. Record repayments as they arrive and the balance
          keeps itself.
        </p>
      </div>

      {/* Only on the first load, so a refetch behind an open sheet does not blank the list. */}
      {loading && loans.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      {!(loading && loans.length === 0) && !error && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Owed to you" value={money.format(outstandingTotal)} accent="var(--brand)" />
            <StatTile
              label="People"
              value={String(owing.length)}
              sub={overdueCount > 0 ? `${overdueCount} overdue` : "Still owing"}
            />
            <StatTile label="Repaid" value={money.format(repaidTotal)} sub="Back so far" />
          </div>

          {groups.length === 0 ? (
            <div
              className="rounded-xl border p-4 text-xs leading-relaxed"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              No loans yet. When you lend someone money, add it here so it doesn't slip your mind.
            </div>
          ) : (
            <>
              {owing.map((group) => (
                <PersonCard
                  key={group.person}
                  group={group}
                  money={money}
                  today={today}
                  onOpen={(loan) => setSheet({ mode: "detail", id: loan.id })}
                />
              ))}

              {settled.length > 0 && (
                <>
                  <h2
                    className="pt-2 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    Settled up
                  </h2>
                  {settled.map((group) => (
                    <PersonCard
                      key={group.person}
                      group={group}
                      money={money}
                      today={today}
                      onOpen={(loan) => setSheet({ mode: "detail", id: loan.id })}
                    />
                  ))}
                </>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setSheet({ mode: "add" })}
            className="h-12 rounded-lg font-display font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-brand)" }}
          >
            Add a loan
          </button>

          <p
            className="rounded-lg border-l-2 py-1 pl-3 text-[11px] leading-relaxed"
            style={{ borderColor: "var(--brand)", color: "var(--text-secondary)" }}
          >
            Loans are kept apart from your month. Lending doesn't count as spending, and a repayment isn't
            income, so your budget stays the same either way.
          </p>
        </>
      )}

      {sheet && (sheet.mode === "add" || open) && (
        <BottomSheet onClose={close}>
          {sheet.mode === "detail" && open ? (
            <LoanDetail
              key={open.id}
              loan={open}
              money={money}
              onRepay={async (repayment) => {
                await addRepayment(open.id, repayment);
                refetch();
              }}
              onRemoveRepayment={async (repaymentId) => {
                await deleteRepayment(open.id, repaymentId);
                refetch();
              }}
              onEdit={() => setSheet({ mode: "edit", id: open.id })}
            />
          ) : (
            <LoanForm
              base={money.base}
              initial={open}
              people={groups.map((g) => g.person)}
              onSave={open ? handleUpdate : handleCreate}
              onDelete={open ? handleDelete : undefined}
            />
          )}
        </BottomSheet>
      )}
    </div>
  );
}
