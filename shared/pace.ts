import { round2 } from "./commitments.ts";

/**
 * How a month's spending is tracking against its target, measured against how
 * much of the month has actually gone.
 *
 * The useful question is not "how much have I spent" but "am I spending faster
 * than the month is passing". Everything here exists to answer that: `index`
 * is the single number for it, and `variance` is the same thing in money.
 */

/** Where the target being measured against came from. */
export type TargetSource =
  /** This month's own override. */
  | "month"
  /** The default target that applies to every month. */
  | "default"
  /** No target set, so the whole spendable budget is the ceiling. */
  | "budget";

export type PaceStatus =
  /** No usable target, so pace cannot be judged. */
  | "no-target"
  /** Spending more slowly than the month is passing. */
  | "under"
  /** Tracking the month within a small tolerance. */
  | "on"
  /** Spending faster than the month is passing, target not yet gone. */
  | "over"
  /** The whole target has been spent. */
  | "exhausted";

export interface BudgetPace {
  /** The ceiling being measured against. */
  target: number;
  source: TargetSource;
  /** True when a target was set, by the month or by the default. */
  custom: boolean;
  spent: number;
  /** target − spent. Negative once the target is passed. */
  remaining: number;

  daysInMonth: number;
  /** Days counted as gone, today included. Null outside the current month. */
  daysGone: number | null;
  daysLeft: number | null;
  /** 0–1, how much of the month has gone. Null outside the current month. */
  elapsed: number | null;

  /** 0–1+, how much of the target is used. */
  used: number;
  /** What should have been spent by now to be exactly on pace. */
  onPace: number | null;
  /** spent − onPace. Positive means spending too fast. */
  variance: number | null;
  /** used ÷ elapsed. 1 is exactly on pace, 2 is twice too fast. */
  index: number | null;

  /** What is safe to spend per remaining day to land on target. */
  dailyAllowance: number | null;
  /** Total spend if the current daily rate continues to month end. */
  projected: number | null;
  /** Day the target runs out at this rate, if that is before month end. */
  exhaustedOnDay: number | null;

  status: PaceStatus;
}

/** How far `index` may stray from 1 before it stops counting as "on pace". */
const ON_PACE_TOLERANCE = 0.1;

export function computeBudgetPace({
  target,
  source,
  spent,
  daysInMonth,
  today,
}: {
  target: number;
  source: TargetSource;
  spent: number;
  daysInMonth: number;
  /** Day of the month, or null when this is not the current month. */
  today: number | null;
}): BudgetPace {
  // Today counts as a day that has gone, matching how the spend projection
  // already averages: on day 18 of 30, 18 days of spending have happened.
  const daysGone = today === null ? null : Math.min(Math.max(today, 0), daysInMonth);
  const daysLeft = daysGone === null ? null : Math.max(daysInMonth - daysGone, 0);
  const elapsed = daysGone === null ? null : daysGone / daysInMonth;

  const usable = target > 0;
  const remaining = round2(target - spent);
  const used = usable ? spent / target : 0;

  const onPace = usable && elapsed !== null ? round2(target * elapsed) : null;
  const variance = onPace === null ? null : round2(spent - onPace);
  const index = usable && elapsed !== null && elapsed > 0 ? round2(used / elapsed) : null;

  const avgDaily = daysGone !== null && daysGone > 0 ? spent / daysGone : null;
  const projected = avgDaily === null ? null : round2(avgDaily * daysInMonth);

  // On the last day there are no days left to divide by, but the remaining
  // money is still today's allowance — so treat it as one day rather than
  // dividing by zero.
  const dailyAllowance = daysLeft === null
    ? null
    : round2(Math.max(remaining, 0) / Math.max(daysLeft, 1));

  /*
   * Only worth reporting when the target runs out *early*. Spending exactly on
   * pace exhausts it on the final day by definition, which is the good outcome
   * rather than a warning, so that case is left null.
   */
  let exhaustedOnDay: number | null = null;
  if (usable && avgDaily !== null && avgDaily > 0 && spent < target) {
    const day = Math.ceil(target / avgDaily);
    if (day < daysInMonth) exhaustedOnDay = day;
  }

  let status: PaceStatus;
  if (!usable) status = "no-target";
  else if (spent >= target) status = "exhausted";
  else if (index === null) status = "under";
  else if (index < 1 - ON_PACE_TOLERANCE) status = "under";
  else if (index <= 1 + ON_PACE_TOLERANCE) status = "on";
  else status = "over";

  return {
    target: round2(target),
    source,
    custom: source !== "budget",
    spent: round2(spent),
    remaining,
    daysInMonth,
    daysGone,
    daysLeft,
    elapsed,
    used,
    onPace,
    variance,
    index,
    dailyAllowance,
    projected,
    exhaustedOnDay,
    status,
  };
}
