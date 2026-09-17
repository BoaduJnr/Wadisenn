import { useState } from "react";
import { createCommitment, deleteCommitment, updateCommitment, type CommitmentInput } from "../api";
import { BottomSheet } from "../components/BottomSheet";
import { CommitmentForm } from "../components/CommitmentForm";
import { StatTile } from "../components/StatTile";
import { useCommitments } from "../hooks/useCommitments";
import { useYearCommitments } from "../hooks/useYearCommitments";
import { categoryColor } from "../lib/categories";
import { chargeFor, round2 } from "../lib/commitments";
import { currentMonthString, monthNameShort } from "../lib/format";
import type { Money } from "../lib/money";
import type { Cadence, Commitment } from "../types";

/** The line under a commitment's name: when it leaves and for how long. */
function timingNote(commitment: Commitment): string {
  const parts: string[] = [];

  if (commitment.cadence === "monthly") {
    parts.push(commitment.dueDay ? `Day ${commitment.dueDay} each month` : "Every month");
  } else if (commitment.spread) {
    parts.push(`Due ${monthNameShort(commitment.dueMonth ?? 1)}, spread over 12 months`);
  } else {
    parts.push(`Every ${monthNameShort(commitment.dueMonth ?? 1)}`);
  }

  if (commitment.endMonth) parts.push(`until ${commitment.endMonth}`);
  return parts.join(" · ");
}

function CommitmentRow({
  commitment,
  money,
  onClick,
}: {
  commitment: Commitment;
  money: Money;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b px-1 py-3 text-left last:border-b-0 active:opacity-70"
      style={{ borderColor: "var(--border)" }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: categoryColor(commitment.category) }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {commitment.label}
        </div>
        <div className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {timingNote(commitment)}
        </div>
      </div>
      <span className="font-display text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {money.format(commitment.amount)}
      </span>
    </button>
  );
}

function Group({
  title,
  blurb,
  commitments,
  money,
  onEdit,
}: {
  title: string;
  blurb: string;
  commitments: Commitment[];
  money: Money;
  onEdit: (commitment: Commitment) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <h2 className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {blurb}
      </p>
      {commitments.length === 0 ? (
        <p className="py-2 text-xs" style={{ color: "var(--muted)" }}>
          Nothing here yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {commitments.map((commitment) => (
            <CommitmentRow
              key={commitment.id}
              commitment={commitment}
              money={money}
              onClick={() => onEdit(commitment)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Twelve bars showing how unevenly the commitment load falls across the year. */
function YearStrip({
  byMonth,
  money,
  thisMonth,
}: {
  byMonth: { month: string; total: number }[];
  money: Money;
  thisMonth: string;
}) {
  const peak = Math.max(...byMonth.map((m) => m.total), 1);

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <h2 className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
        Across the year
      </h2>
      <div className="flex items-end gap-1 pt-1">
        {byMonth.map((entry) => {
          const isThisMonth = entry.month === thisMonth;
          const monthNo = Number(entry.month.split("-")[1]);
          return (
            <div key={entry.month} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-20 w-full items-end">
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max((entry.total / peak) * 100, entry.total > 0 ? 3 : 0)}%`,
                    background: isThisMonth ? "var(--brand)" : "var(--tone-fixed)",
                    opacity: isThisMonth ? 1 : 0.55,
                  }}
                  title={`${monthNameShort(monthNo)}: ${money.format(entry.total)}`}
                />
              </div>
              <span
                className="text-[9px] font-semibold"
                style={{ color: isThisMonth ? "var(--brand)" : "var(--muted)" }}
              >
                {monthNameShort(monthNo).charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Taller bars are the months a yearly bill lands in. Spread one over twelve months to flatten it.
      </p>
    </div>
  );
}

export function CommitmentsView({ money, onChanged }: { money: Money; onChanged: () => void }) {
  const { commitments, loading, error, refetch } = useCommitments();
  const thisMonth = currentMonthString();
  const currentYear = Number(thisMonth.split("-")[0]);
  const { year, refetch: refetchYear } = useYearCommitments(currentYear);

  const [editing, setEditing] = useState<Commitment | null>(null);
  const [adding, setAdding] = useState(false);

  const byCadence = (cadence: Cadence) => commitments.filter((c) => c.cadence === cadence);

  // Only what actually lands on the current month, so a commitment that has
  // already ended does not keep inflating the headline figure.
  const monthlyNow = round2(
    byCadence("monthly").reduce((sum, c) => sum + chargeFor(c, thisMonth), 0),
  );

  function afterChange() {
    refetch();
    refetchYear();
    onChanged();
    setEditing(null);
    setAdding(false);
  }

  async function handleCreate(values: CommitmentInput) {
    await createCommitment(values);
    afterChange();
  }

  async function handleUpdate(values: CommitmentInput) {
    if (!editing) return;
    await updateCommitment(editing.id, values);
    afterChange();
  }

  async function handleDelete() {
    if (!editing) return;
    await deleteCommitment(editing.id);
    afterChange();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-safe pt-4 pb-nav">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          Fixed costs
        </h1>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Rent, utilities, subscriptions, yearly renewals. These come out of your income before a single day of
          spending is counted, so you never budget with money that was already promised.
        </p>
      </div>

      {loading && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {year && (
            <div className="grid grid-cols-3 gap-2">
              <StatTile
                label="Monthly"
                value={money.format(monthlyNow)}
                sub="Every month"
              />
              <StatTile
                label={String(currentYear)}
                value={money.format(year.total)}
                sub="Committed this year"
                accent="var(--tone-fixed)"
              />
              <StatTile
                label="Average"
                value={money.format(year.monthlyAverage)}
                sub="Per month"
              />
            </div>
          )}

          {year && commitments.length > 0 && (
            <YearStrip byMonth={year.byMonth} money={money} thisMonth={thisMonth} />
          )}

          <Group
            title="Monthly"
            blurb="Deducted from every month inside its date range."
            commitments={byCadence("monthly")}
            money={money}
            onEdit={setEditing}
          />

          <Group
            title="Yearly"
            blurb="Deducted in full in the month it falls due, or a twelfth at a time if you spread it."
            commitments={byCadence("yearly")}
            money={money}
            onEdit={setEditing}
          />

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-12 rounded-lg font-display font-semibold"
            style={{ background: "var(--accent)", color: "var(--on-brand)" }}
          >
            Add a fixed cost
          </button>

          <p
            className="rounded-lg border-l-2 py-1 pl-3 text-[11px] leading-relaxed"
            style={{ borderColor: "var(--brand)", color: "var(--text-secondary)" }}
          >
            Fixed costs are deducted for you. Logging rent as an expense as well would count it twice.
          </p>
        </>
      )}

      {(adding || editing) && (
        <BottomSheet
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <CommitmentForm
            base={money.base}
            initial={editing}
            onSave={editing ? handleUpdate : handleCreate}
            onDelete={editing ? handleDelete : undefined}
          />
        </BottomSheet>
      )}
    </div>
  );
}
