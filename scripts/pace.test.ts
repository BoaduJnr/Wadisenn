/**
 * Tests for the budget-pace maths.
 *
 *   node scripts/pace.test.ts
 *
 * Pure arithmetic, so no database is needed.
 */
import { computeBudgetPace } from "../shared/pace.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}`, detail ?? "");
  }
}

/** 30-day month, GHS 3,000 target, unless overridden. */
const at = (spent: number, today: number | null, over: Partial<{ target: number; daysInMonth: number }> = {}) =>
  computeBudgetPace({
    target: over.target ?? 3000,
    source: "month",
    spent,
    daysInMonth: over.daysInMonth ?? 30,
    today,
  });

console.log("\n== exactly on pace ==");
let p = at(1500, 15);
check("half the month gone", p.elapsed === 0.5, p.elapsed);
check("should have spent 1500", p.onPace === 1500, p.onPace);
check("variance zero", p.variance === 0, p.variance);
check("index 1", p.index === 1, p.index);
check("status on", p.status === "on", p.status);
check("15 days left", p.daysLeft === 15);
check("100/day for the rest", p.dailyAllowance === 100, p.dailyAllowance);
check("projected lands on target", p.projected === 3000, p.projected);
check("on pace is not flagged as running out early", p.exhaustedOnDay === null, p.exhaustedOnDay);

console.log("\n== spending too fast ==");
p = at(2000, 15);
check("index 1.33", p.index === 1.33, p.index);
check("500 ahead of pace", p.variance === 500, p.variance);
check("status over", p.status === "over", p.status);
check("projected 4000, past target", p.projected === 4000, p.projected);
check("target gone on day 23", p.exhaustedOnDay === 23, p.exhaustedOnDay);
check("only 66.67/day left", p.dailyAllowance === 66.67, p.dailyAllowance);

console.log("\n== spending slowly ==");
p = at(900, 15);
check("index 0.6", p.index === 0.6, p.index);
check("600 behind pace", p.variance === -600, p.variance);
check("status under", p.status === "under", p.status);
check("140/day available", p.dailyAllowance === 140, p.dailyAllowance);

console.log("\n== the on-pace tolerance band ==");
check("index 0.90 counts as on pace", at(1350, 15).status === "on", at(1350, 15).index);
check("index 1.10 counts as on pace", at(1650, 15).status === "on", at(1650, 15).index);
check("index 0.89 is under", at(1330, 15).status === "under", at(1330, 15).index);
check("index 1.11 is over", at(1670, 15).status === "over", at(1670, 15).index);

console.log("\n== target fully spent ==");
p = at(3000, 15);
check("status exhausted at exactly the target", p.status === "exhausted", p.status);
check("remaining zero", p.remaining === 0);
check("no allowance left", p.dailyAllowance === 0, p.dailyAllowance);
p = at(3600, 20);
check("overspent is still exhausted", p.status === "exhausted");
check("remaining goes negative", p.remaining === -600, p.remaining);
check("no exhaustion forecast once it has happened", p.exhaustedOnDay === null);

console.log("\n== first and last day ==");
p = at(0, 1);
check("day 1, nothing spent: under", p.status === "under", p.status);
check("day 1 counts as elapsed", p.daysGone === 1 && p.daysLeft === 29);
check("index 0 with no spend", p.index === 0, p.index);
p = at(2900, 30);
check("last day: no days left", p.daysLeft === 0);
check("remaining is today's allowance, not a divide by zero", p.dailyAllowance === 100, p.dailyAllowance);
check("elapsed is exactly 1", p.elapsed === 1);

console.log("\n== a month that is not the current one ==");
p = at(2400, null);
check("no elapsed", p.elapsed === null);
check("no pace index", p.index === null);
check("no variance", p.variance === null);
check("no daily allowance", p.dailyAllowance === null);
check("under target reported as under", p.status === "under", p.status);
check("over target reported as exhausted", at(3200, null).status === "exhausted");

console.log("\n== no usable target ==");
for (const target of [0, -100]) {
  p = at(500, 15, { target });
  check(`target ${target} gives no-target`, p.status === "no-target", p.status);
  check(`  used is 0, not Infinity`, p.used === 0, p.used);
  check(`  index null`, p.index === null);
}

console.log("\n== short and long months ==");
// Half of a 28-day month, against half of the same 3,000 target.
p = at(1500, 14, { daysInMonth: 28 });
check("February half-way is on pace", p.status === "on" && p.index === 1, p.index);
check("February allowance spreads over 14 days", p.dailyAllowance === 107.14, p.dailyAllowance);
p = at(1000, 10, { daysInMonth: 31 });
check("31-day month scales correctly", p.onPace === 967.74, p.onPace);

console.log("\n== running out early is only flagged when it really is early ==");
p = at(2000, 20);
check("lands on the last day, so not flagged", p.exhaustedOnDay === null, p.exhaustedOnDay);
p = at(2500, 20);
check("clearly fast, flagged for day 24", p.exhaustedOnDay === 24, p.exhaustedOnDay);

console.log("\n== a big early purchase reads as over, honestly ==");
p = at(1200, 2);
check("day 2, 1200 spent: over", p.status === "over", p.status);
check("index is large", p.index === 6, p.index);
check("forecast to run out on day 5", p.exhaustedOnDay === 5, p.exhaustedOnDay);

console.log("\n== custom flag is carried through ==");
const withSource = (source: "month" | "default" | "budget") =>
  computeBudgetPace({ target: 100, source, spent: 0, daysInMonth: 30, today: 1 });

check("month override is reported as its own source", withSource("month").source === "month");
check("  and counts as a set target", withSource("month").custom === true);
check("default target is reported as the default", withSource("default").source === "default");
check("  and also counts as a set target", withSource("default").custom === true);
check("falling back to the budget is not a set target", withSource("budget").custom === false);
check("  with source budget", withSource("budget").source === "budget");

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
