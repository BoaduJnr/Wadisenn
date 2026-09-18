import type { Commitment, MonthSummary } from "../../shared/types.ts";
import { commitmentsForYear, round2 } from "../../shared/commitments.ts";
import { monthsPrefix } from "./keys.ts";
import type { Store } from "./store.ts";
import {
  computeMonthSummary,
  currentMonthString,
  getSettings,
  listCommitments,
  listExpenses,
} from "./aggregate.ts";

/** Months back to include in the history and category breakdowns. */
const HISTORY_MONTHS = 6;
const CATEGORY_MONTHS = 3;

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function line(label: string, value: string): string {
  return `  ${label}: ${value}`;
}

function describeCommitment(c: Commitment): string {
  const when = c.cadence === "monthly"
    ? c.dueDay ? `every month on day ${c.dueDay}` : "every month"
    : c.spread
    ? `yearly, due month ${c.dueMonth ?? 1}, spread over 12 months`
    : `yearly, due in month ${c.dueMonth ?? 1}`;
  const until = c.endMonth ? `, until ${c.endMonth}` : "";
  return `  - ${c.label} (${c.category}): ${round2(c.amount)} ${when}, from ${c.startMonth}${until}`;
}

/**
 * Renders the user's actual finances as plain text for the advisor's prompt.
 *
 * Kept as text rather than JSON because the model reasons more reliably over
 * labelled lines than over nested objects, and because this exact string is
 * also shown to the user so they can see what is being sent.
 *
 * Every figure is in the base currency. The display currency is mentioned only
 * so the advisor can echo the right code back, never to convert anything.
 */
export async function buildSnapshotText(kv: Store): Promise<string> {
  const thisMonth = currentMonthString();
  const [settings, commitments, current] = await Promise.all([
    getSettings(kv),
    listCommitments(kv),
    computeMonthSummary(kv, thisMonth),
  ]);

  const out: string[] = [];
  const base = settings.currency;

  out.push("CURRENCY");
  out.push(line("all amounts below are in", base));
  if (settings.displayCurrency && settings.displayCurrency !== base) {
    out.push(line("user views amounts converted to", `${settings.displayCurrency} (display only)`));
  }

  out.push("", `THIS MONTH (${thisMonth}${current.today ? `, day ${current.today} of ${current.daysInMonth}` : ""})`);
  out.push(line("income", String(round2(current.income.total))));
  if (current.income.addOns.length > 0) {
    out.push(
      line(
        "  of which one-off",
        current.income.addOns.map((a) => `${a.label} ${round2(a.amount)}`).join(", "),
      ),
    );
  }
  out.push(line("fixed commitments", String(current.commitments.total)));
  out.push(line("  fixed monthly", String(current.commitments.monthlyTotal)));
  out.push(line("  fixed yearly this month", String(current.commitments.yearlyTotal)));
  out.push(line("spendable budget after fixed costs", String(current.budget)));
  out.push(line("spent so far", String(round2(current.totalSpent))));
  out.push(line("free to spend right now", String(current.remaining)));

  const pace = current.pace;
  out.push(
    line(
      "spending target",
      pace.source === "month"
        ? `${pace.target} (set for this month)`
        : pace.source === "default"
        ? `${pace.target} (the user's default target for every month)`
        : `${pace.target} (no target set; the whole spendable budget)`,
    ),
  );
  if (pace.index !== null) {
    out.push(line("  should have spent by now, to be on pace", String(pace.onPace)));
    out.push(
      line(
        "  pace",
        `${pace.index}x (${pace.status}; ${pace.variance! >= 0 ? "+" : ""}${pace.variance} against pace)`,
      ),
    );
    out.push(line("  safe to spend per remaining day", `${pace.dailyAllowance} over ${pace.daysLeft} days`));
  }
  if (current.projectedTotalSpend !== null) {
    out.push(line("projected total spend by month end", String(round2(current.projectedTotalSpend))));
    out.push(line("projected free at month end", String(round2(current.projectedRemaining ?? 0))));
  }

  out.push("", "FIXED COMMITMENTS (standing costs, deducted before any spending)");
  if (commitments.length === 0) {
    out.push("  (none recorded)");
  } else {
    for (const c of commitments) out.push(describeCommitment(c));
  }
  const year = Number(thisMonth.split("-")[0]);
  const load = commitmentsForYear(commitments, year);
  out.push(line(`total committed across ${year}`, String(load.total)));
  out.push(line("  averaged per month", String(load.monthlyAverage)));

  // History: walk backwards from this month so gaps stay visible as gaps.
  out.push("", `LAST ${HISTORY_MONTHS} MONTHS (income / fixed / spent / kept)`);
  const recorded = new Set<string>();
  for await (const entry of kv.list<{ month: string }>({ prefix: monthsPrefix() })) {
    recorded.add(entry.value.month);
  }
  for await (const entry of kv.list({ prefix: ["expenses"] })) {
    recorded.add(entry.key[1] as string);
  }

  const history: MonthSummary[] = [];
  for (let i = HISTORY_MONTHS; i >= 1; i--) {
    const month = shiftMonth(thisMonth, -i);
    if (!recorded.has(month)) continue;
    history.push(await computeMonthSummary(kv, month));
  }
  if (history.length === 0) {
    out.push("  (no completed months recorded yet)");
  } else {
    for (const h of history) {
      out.push(
        `  ${h.month}  income ${round2(h.income.total)}  fixed ${h.commitments.total}  spent ${
          round2(h.totalSpent)
        }  kept ${h.remaining}`,
      );
    }
    const kept = round2(history.reduce((sum, h) => sum + h.remaining, 0));
    const avgKept = round2(kept / history.length);
    out.push(line("total kept over those months", String(kept)));
    out.push(line("average kept per month", String(avgKept)));
    const overspent = history.filter((h) => h.remaining < 0).length;
    out.push(line("months that went past the budget", `${overspent} of ${history.length}`));
  }

  // Category mix drives most practical advice ("your transport is 30% of spend").
  out.push("", `SPENDING BY CATEGORY (last ${CATEGORY_MONTHS} months including this one)`);
  const byCategory = new Map<string, number>();
  let categoryTotal = 0;
  for (let i = 0; i < CATEGORY_MONTHS; i++) {
    const month = shiftMonth(thisMonth, -i);
    for (const e of await listExpenses(kv, month)) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
      categoryTotal += e.amount;
    }
  }
  if (categoryTotal === 0) {
    out.push("  (nothing logged yet)");
  } else {
    for (const [category, amount] of [...byCategory].sort((a, b) => b[1] - a[1])) {
      const share = Math.round((amount / categoryTotal) * 100);
      out.push(`  ${category}: ${round2(amount)} (${share}% of logged spending)`);
    }
    out.push(line("total logged over those months", String(round2(categoryTotal))));
  }

  out.push("", "GHANAIAN BENCHMARK RATES (entered by the user; may be out of date)");
  const market = settings.marketContext;
  const hasMarket = market &&
    (market.tbillRate !== undefined || market.inflation !== undefined || market.loanApr !== undefined);
  if (!hasMarket) {
    out.push("  (none supplied — you have NO current rate data, so ask for any figure you need)");
  } else {
    if (market?.tbillRate !== undefined) out.push(line("91-day Treasury bill", `${market.tbillRate}% per year`));
    if (market?.inflation !== undefined) out.push(line("inflation (year on year)", `${market.inflation}%`));
    if (market?.loanApr !== undefined) out.push(line("typical bank loan APR", `${market.loanApr}%`));
    if (market?.updatedAt) out.push(line("last updated by the user", market.updatedAt));
  }

  return out.join("\n");
}
