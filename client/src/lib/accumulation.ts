import type { MonthSummary } from "../types";
import { round2 } from "./commitments";
import { monthLabelShort, monthLabelShortWithYear } from "./format";

export interface AccumulationPoint {
  month: string;
  label: string;
  /** What was left of that month on its own. Negative if it overspent. */
  kept: number;
  /** Every month up to and including this one, added together. */
  cumulative: number;
  /** True for a month still being spent, whose figure can still move. */
  inProgress: boolean;
}

export interface Accumulation {
  points: AccumulationPoint[];
  /** The running total at the most recent month. */
  total: number;
  /** The first month that counts toward the total, across all history. */
  since: string | null;
  /** True when the newest month has not finished yet. */
  endsInProgress: boolean;
}

/**
 * Turns month summaries into a running total of what survived each month.
 *
 * The sum is taken over the whole history first and only then windowed, so the
 * line always shows the true all-time position rather than restarting from zero
 * at the left edge of the chart.
 */
export function buildAccumulation(summaries: MonthSummary[], window = 12): Accumulation {
  const chronological = [...summaries].sort((a, b) => a.month.localeCompare(b.month));

  let running = 0;
  const all: AccumulationPoint[] = chronological.map((summary) => {
    running += summary.remaining;
    return {
      month: summary.month,
      label: "",
      kept: round2(summary.remaining),
      cumulative: round2(running),
      inProgress: summary.isCurrentMonth,
    };
  });

  const points = all.slice(-window);

  // Bare month names are ambiguous once the window crosses a year boundary.
  const years = new Set(points.map((p) => p.month.split("-")[0]));
  const label = years.size > 1 ? monthLabelShortWithYear : monthLabelShort;
  for (const point of points) point.label = label(point.month);

  return {
    points,
    total: all.length > 0 ? all[all.length - 1].cumulative : 0,
    since: all.length > 0 ? all[0].month : null,
    endsInProgress: all.length > 0 && all[all.length - 1].inProgress,
  };
}
