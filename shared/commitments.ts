import type {
  Commitment,
  CommitmentCharge,
  MonthCommitments,
  YearCommitments,
} from "./types.ts";

/**
 * Commitment maths, kept pure and shared so the month summary on the server and
 * the yearly view on the client can never drift apart.
 *
 * "YYYY-MM" strings are ordered lexicographically, which for a fixed-width
 * zero-padded format is the same as ordering by date — so plain string
 * comparison is enough to test a start/end window.
 */

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function monthNumber(month: string): number {
  return Number(month.split("-")[1]);
}

export function yearNumber(month: string): number {
  return Number(month.split("-")[0]);
}

export function monthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/** Whether a commitment's start/end window covers the given month. */
export function appliesTo(commitment: Commitment, month: string): boolean {
  if (month < commitment.startMonth) return false;
  if (commitment.endMonth && month > commitment.endMonth) return false;
  return true;
}

/**
 * What a single commitment takes out of one month. Monthly costs charge every
 * month in their window; a yearly cost either charges in full in its due month,
 * or — when spread — reserves a twelfth of itself every month instead.
 */
export function chargeFor(commitment: Commitment, month: string): number {
  if (!appliesTo(commitment, month)) return 0;
  if (commitment.cadence === "monthly") return commitment.amount;
  if (commitment.spread) return commitment.amount / 12;
  return monthNumber(month) === (commitment.dueMonth ?? 1) ? commitment.amount : 0;
}

/** Every commitment that touches the given month, with the month's totals. */
export function commitmentsForMonth(commitments: Commitment[], month: string): MonthCommitments {
  const charges: CommitmentCharge[] = [];
  let monthlyTotal = 0;
  let yearlyTotal = 0;

  for (const commitment of commitments) {
    const amount = chargeFor(commitment, month);
    if (amount === 0) continue;

    if (commitment.cadence === "monthly") monthlyTotal += amount;
    else yearlyTotal += amount;

    charges.push({
      id: commitment.id,
      label: commitment.label,
      amount: round2(amount),
      cadence: commitment.cadence,
      category: commitment.category,
      dueDay: commitment.dueDay,
      dueMonth: commitment.dueMonth,
      reserved: commitment.cadence === "yearly" && Boolean(commitment.spread),
    });
  }

  charges.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  return {
    charges,
    monthlyTotal: round2(monthlyTotal),
    yearlyTotal: round2(yearlyTotal),
    total: round2(monthlyTotal + yearlyTotal),
  };
}

/** The same maths walked over all twelve months of a calendar year. */
export function commitmentsForYear(commitments: Commitment[], year: number): YearCommitments {
  const byMonth: { month: string; total: number }[] = [];
  let monthlyTotal = 0;
  let yearlyTotal = 0;

  for (const month of monthsOfYear(year)) {
    const summary = commitmentsForMonth(commitments, month);
    byMonth.push({ month, total: summary.total });
    monthlyTotal += summary.monthlyTotal;
    yearlyTotal += summary.yearlyTotal;
  }

  const total = monthlyTotal + yearlyTotal;

  return {
    year,
    byMonth,
    monthlyTotal: round2(monthlyTotal),
    yearlyTotal: round2(yearlyTotal),
    total: round2(total),
    monthlyAverage: round2(total / 12),
  };
}
