/**
 * End-to-end API tests over the real router, backed by MongoDB.
 *
 *   docker run -d --name wadisenn-mongo -p 27019:27017 mongo:7
 *   MONGODB_TEST_URI="mongodb://127.0.0.1:27019/?directConnection=true" node scripts/api.test.ts
 *
 * This is the regression suite that proves the move off Deno KV preserved
 * behaviour: the same assertions that passed against Deno KV are asserted here
 * against the document store.
 */
import { MongoStore } from "../server/lib/mongo-store.ts";
import { handleApiRequest } from "../server/router.ts";

const uri = process.env.MONGODB_TEST_URI;
if (!uri) {
  console.error("set MONGODB_TEST_URI");
  process.exit(1);
}

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name}`, detail ?? "");
  }
}

const store = await MongoStore.connect(uri, "wadisenn_apitest");

async function call(method: string, path: string, body?: unknown) {
  const res = await handleApiRequest(
    new Request(`http://x${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    store,
  );
  return { status: res.status, body: await res.json() as any };
}

async function reset() {
  for await (const e of store.list({ prefix: [] })) await store.delete(e.key);
}

await reset();

console.log("\n== settings ==");
let s = await call("PUT", "/api/settings", { defaultMonthlySalary: 5000, currency: "GHS" });
check("saved", s.status === 200, s.body);
check("read back", (await call("GET", "/api/settings")).body.defaultMonthlySalary === 5000);
check("rejects non-numeric salary",
  (await call("PUT", "/api/settings", { defaultMonthlySalary: "x" })).status === 400);

console.log("\n== display currency + market context persist ==");
s = await call("PUT", "/api/settings", {
  defaultMonthlySalary: 5000,
  currency: "ghs",
  displayCurrency: " usd ",
  marketContext: { tbillRate: 26.5, inflation: 11.8, loanApr: 34 },
});
check("base upper-cased", s.body.currency === "GHS", s.body.currency);
check("display normalised", s.body.displayCurrency === "USD", s.body.displayCurrency);
check("market rates stored", s.body.marketContext?.tbillRate === 26.5, s.body.marketContext);
const stamped = s.body.marketContext.updatedAt;
check("updatedAt stamped", typeof stamped === "string");
s = await call("PUT", "/api/settings", {
  defaultMonthlySalary: 5200, currency: "GHS", marketContext: s.body.marketContext,
});
check("unrelated save keeps rates and date", s.body.marketContext?.updatedAt === stamped, s.body.marketContext);
// Settings saves merge, so omitting a field keeps it. Clearing takes a null,
// which is asserted in the merge section below.
check("display currency survives an unrelated save", s.body.displayCurrency === "USD", s.body);

console.log("\n== commitments ==");
await call("PUT", "/api/settings", { defaultMonthlySalary: 5000, currency: "GHS" });
const rent = await call("POST", "/api/commitments", {
  label: "Rent", amount: 1200, cadence: "monthly", category: "Bills", dueDay: 1, startMonth: "2026-01",
});
check("rent created", rent.status === 201, rent.body);
const net = await call("POST", "/api/commitments", {
  label: "Internet", amount: 250, cadence: "monthly", category: "Bills", startMonth: "2026-01",
});
const ins = await call("POST", "/api/commitments", {
  label: "Car insurance", amount: 1800, cadence: "yearly", category: "Other", dueMonth: 6, startMonth: "2026-01",
});
check("three listed", (await call("GET", "/api/commitments")).body.length === 3);

console.log("\n== commitment validation ==");
for (const [name, payload] of [
  ["zero amount", { label: "X", amount: 0, cadence: "monthly", startMonth: "2026-01" }],
  ["bad cadence", { label: "X", amount: 5, cadence: "weekly", startMonth: "2026-01" }],
  ["missing label", { amount: 5, cadence: "monthly", startMonth: "2026-01" }],
  ["bad startMonth", { label: "X", amount: 5, cadence: "monthly", startMonth: "2026" }],
  ["end before start", { label: "X", amount: 5, cadence: "monthly", startMonth: "2026-05", endMonth: "2026-03" }],
  ["dueDay 32", { label: "X", amount: 5, cadence: "monthly", startMonth: "2026-01", dueDay: 32 }],
  ["dueMonth 13", { label: "X", amount: 5, cadence: "yearly", startMonth: "2026-01", dueMonth: 13 }],
] as const) {
  check(`rejects ${name}`, (await call("POST", "/api/commitments", payload)).status === 400);
}
check("404 updating a missing commitment",
  (await call("PUT", "/api/commitments/nope", { amount: 10 })).status === 404);
check("invalid month rejected by the router",
  (await call("GET", "/api/months/2026-1/summary")).status === 400);

console.log("\n== month summary maths ==");
let sum = (await call("GET", "/api/months/2026-03/summary")).body;
check("income 5000", sum.income.total === 5000);
check("fixed monthly 1450", sum.commitments.monthlyTotal === 1450, sum.commitments);
check("no yearly charge in March", sum.commitments.yearlyTotal === 0);
check("budget 3550", sum.budget === 3550);
sum = (await call("GET", "/api/months/2026-06/summary")).body;
check("yearly bill lands in June", sum.commitments.yearlyTotal === 1800, sum.commitments);
check("June budget 1750", sum.budget === 1750);
check("three charges in June", sum.commitments.charges.length === 3);

console.log("\n== expenses draw down the budget ==");
await call("POST", "/api/months/2026-03/expenses", { date: "2026-03-05", amount: 400, category: "Food" });
const e2 = await call("POST", "/api/months/2026-03/expenses", { date: "2026-03-09", amount: 150, category: "Transport" });
check("expense created", e2.status === 201, e2.body);
check("rejects an expense with no amount",
  (await call("POST", "/api/months/2026-03/expenses", { date: "2026-03-09", category: "Food" })).status === 400);
sum = (await call("GET", "/api/months/2026-03/summary")).body;
check("spent 550", sum.totalSpent === 550);
check("remaining 3000", sum.remaining === 3000);
check("fixed + spent + kept = income",
  Math.abs(sum.commitments.total + sum.totalSpent + sum.remaining - sum.income.total) < 0.005,
  [sum.commitments.total, sum.totalSpent, sum.remaining, sum.income.total]);
check("daily cumulative covers the month", sum.dailyCumulative.length === 31);
check("cumulative ends at total spent",
  sum.dailyCumulative[sum.dailyCumulative.length - 1].cumulativeSpent === 550);

console.log("\n== expense list, edit, delete ==");
let list = (await call("GET", "/api/months/2026-03/expenses")).body;
check("two expenses listed", list.length === 2, list.length);
check("sorted by date", list[0].date <= list[1].date);
const edited = await call("PUT", `/api/months/2026-03/expenses/${e2.body.id}`, { amount: 175 });
check("edit applied", edited.body.amount === 175, edited.body);
check("edit preserved other fields", edited.body.category === "Transport");
check("404 editing a missing expense",
  (await call("PUT", "/api/months/2026-03/expenses/nope", { amount: 1 })).status === 404);
await call("DELETE", `/api/months/2026-03/expenses/${e2.body.id}`);
check("delete applied", (await call("GET", "/api/months/2026-03/expenses")).body.length === 1);

console.log("\n== unique ids: no expense ever overwrites another ==");
const created = await Promise.all(
  Array.from({ length: 25 }, () =>
    call("POST", "/api/months/2026-05/expenses", { date: "2026-05-01", amount: 1, category: "Food" })),
);
check("all 25 created", created.every((c) => c.status === 201));
check("25 distinct ids", new Set(created.map((c) => c.body.id)).size === 25);
check("all 25 readable back", (await call("GET", "/api/months/2026-05/expenses")).body.length === 25);

console.log("\n== spread a yearly cost ==");
await call("PUT", `/api/commitments/${ins.body.id}`, { spread: true });
check("March now reserves 150",
  (await call("GET", "/api/months/2026-03/summary")).body.commitments.yearlyTotal === 150);
check("June also only 150",
  (await call("GET", "/api/months/2026-06/summary")).body.commitments.yearlyTotal === 150);

console.log("\n== year view ==");
let y = (await call("GET", "/api/commitments/year/2026")).body;
check("12 months", y.byMonth.length === 12);
check("monthly total 17400", y.monthlyTotal === 17400, y.monthlyTotal);
check("yearly total 1800", y.yearlyTotal === 1800, y.yearlyTotal);
check("total 19200", y.total === 19200);
check("average 1600", y.monthlyAverage === 1600);
check("even across the year when spread",
  new Set(y.byMonth.map((m: { total: number }) => m.total)).size === 1);
await call("PUT", `/api/commitments/${ins.body.id}`, { spread: false });
y = (await call("GET", "/api/commitments/year/2026")).body;
check("total unchanged when unspread", y.total === 19200);
check("one month heavier when unspread",
  new Set(y.byMonth.map((m: { total: number }) => m.total)).size === 2);
check("rejects a bad year", (await call("GET", "/api/commitments/year/abcd")).status === 400);

console.log("\n== start / end window ==");
await call("PUT", `/api/commitments/${rent.body.id}`, { endMonth: "2026-04" });
check("rent gone after its end month",
  (await call("GET", "/api/months/2026-05/summary")).body.commitments.monthlyTotal === 250);
check("rent counted in its end month",
  (await call("GET", "/api/months/2026-04/summary")).body.commitments.monthlyTotal === 1450);
check("nothing before the start month",
  (await call("GET", "/api/months/2025-12/summary")).body.commitments.total === 0);

console.log("\n== months listing (relies on ordered prefix scans) ==");
const months = (await call("GET", "/api/months")).body;
const listed = months.map((m: { month: string }) => m.month);
check("every month with data appears", ["2026-03", "2026-05"].every((m) => listed.includes(m)), listed);
check("newest first", [...listed].sort().reverse().join(",") === listed.join(","), listed);

console.log("\n== add-ons ==");
const addOn = await call("POST", "/api/months/2026-03/addons", { label: "Side Gig", amount: 3000 });
check("add-on created", addOn.status === 200 || addOn.status === 201, addOn.body);
check("income includes it",
  (await call("GET", "/api/months/2026-03/summary")).body.income.total === 8000,
  (await call("GET", "/api/months/2026-03/summary")).body.income);
check("rejects an add-on with no label",
  (await call("POST", "/api/months/2026-03/addons", { amount: 10 })).status === 400);
await call("DELETE", `/api/months/2026-03/addons/${addOn.body.id}`);
check("removed again",
  (await call("GET", "/api/months/2026-03/summary")).body.income.total === 5000);

console.log("\n== salary override ==");
await call("PUT", "/api/months/2026-03", { salaryOverride: 9000, addOns: [] });
check("override applied",
  (await call("GET", "/api/months/2026-03/summary")).body.income.base === 9000);
await call("PUT", "/api/months/2026-03", { salaryOverride: null, addOns: [] });
check("override cleared",
  (await call("GET", "/api/months/2026-03/summary")).body.income.base === 5000);

console.log("\n== settings saves merge, so separate forms cannot clobber ==");
await call("PUT", "/api/settings", {
  defaultMonthlySalary: 6000,
  currency: "GHS",
  displayCurrency: "USD",
  marketContext: { tbillRate: 26.5 },
  defaultTargetBudget: 4000,
});
let st = (await call("GET", "/api/settings")).body;
check("everything stored", st.defaultTargetBudget === 4000 && st.displayCurrency === "USD", st);

await call("PUT", "/api/settings", { defaultMonthlySalary: 6500 });
st = (await call("GET", "/api/settings")).body;
check("salary-only save keeps the default target", st.defaultTargetBudget === 4000, st);
check("  keeps the display currency", st.displayCurrency === "USD", st);
check("  keeps the market rates", st.marketContext?.tbillRate === 26.5, st);
check("  and applies the salary", st.defaultMonthlySalary === 6500);

await call("PUT", "/api/settings", { defaultTargetBudget: 3500 });
st = (await call("GET", "/api/settings")).body;
check("target-only save keeps the salary", st.defaultMonthlySalary === 6500, st);
check("  keeps the display currency", st.displayCurrency === "USD", st);
check("  and applies the target", st.defaultTargetBudget === 3500);

console.log("\n== explicit null clears, undefined keeps ==");
await call("PUT", "/api/settings", { displayCurrency: null });
st = (await call("GET", "/api/settings")).body;
check("null cleared the display currency", st.displayCurrency === undefined, st);
check("  without touching the target", st.defaultTargetBudget === 3500, st);
await call("PUT", "/api/settings", { defaultTargetBudget: null });
st = (await call("GET", "/api/settings")).body;
check("null cleared the default target", st.defaultTargetBudget === undefined, st);
check("  without touching the salary", st.defaultMonthlySalary === 6500, st);
for (const bad of [0, -100, "x"]) {
  await call("PUT", "/api/settings", { defaultTargetBudget: bad });
  const got = (await call("GET", "/api/settings")).body.defaultTargetBudget;
  check(`junk default target ${JSON.stringify(bad)} ignored`, got === undefined, got);
}
check("a bad salary is still rejected outright",
  (await call("PUT", "/api/settings", { defaultMonthlySalary: "x" })).status === 400);

console.log("\n== target resolves month -> default -> spendable budget ==");
const m = new Date().toISOString().slice(0, 7);
await call("PUT", `/api/months/${m}`, { targetBudget: null });
await call("PUT", "/api/settings", { defaultTargetBudget: null });
let sp = (await call("GET", `/api/months/${m}/summary`)).body.pace;
check("no targets at all: falls back to the budget", sp.source === "budget" && sp.custom === false, sp);

await call("PUT", "/api/settings", { defaultTargetBudget: 4000 });
sp = (await call("GET", `/api/months/${m}/summary`)).body.pace;
check("default applies when the month has none", sp.source === "default" && sp.target === 4000, sp);
check("  and counts as a set target", sp.custom === true);

await call("PUT", `/api/months/${m}`, { targetBudget: 1800 });
sp = (await call("GET", `/api/months/${m}/summary`)).body.pace;
check("month override beats the default", sp.source === "month" && sp.target === 1800, sp);

await call("PUT", `/api/months/${m}`, { targetBudget: null });
sp = (await call("GET", `/api/months/${m}/summary`)).body.pace;
check("clearing the month falls back to the default", sp.source === "default" && sp.target === 4000, sp);

console.log("\n== a different month also picks up the default ==");
sp = (await call("GET", "/api/months/2026-02/summary")).body.pace;
check("default applies to every month", sp.source === "default" && sp.target === 4000, sp);
await call("PUT", "/api/settings", { defaultTargetBudget: null });

console.log("\n== target budget: set, persist, and pace ==");
const thisMonth = new Date().toISOString().slice(0, 7);
await call("PUT", "/api/settings", { defaultMonthlySalary: 6000, currency: "GHS" });

let sum2 = (await call("GET", `/api/months/${thisMonth}/summary`)).body;
check(
  "no target set falls back to the spendable budget",
  sum2.pace.custom === false && sum2.pace.target === sum2.budget,
  sum2.pace,
);
check("pace block present for the current month", sum2.pace.elapsed !== null, sum2.pace);

let rec = await call("PUT", `/api/months/${thisMonth}`, { targetBudget: 2000 });
check("target saved", rec.body.targetBudget === 2000, rec.body);
sum2 = (await call("GET", `/api/months/${thisMonth}/summary`)).body;
check("summary uses the custom target", sum2.pace.target === 2000 && sum2.pace.custom === true, sum2.pace);
check(
  "onPace is target x elapsed",
  Math.abs(sum2.pace.onPace - 2000 * sum2.pace.elapsed) < 0.02,
  sum2.pace,
);
check(
  "daysGone + daysLeft equals the month",
  sum2.pace.daysGone + sum2.pace.daysLeft === sum2.pace.daysInMonth,
  sum2.pace,
);

console.log("\n== the separate little forms must not clobber each other ==");
await call("PUT", `/api/months/${thisMonth}`, { salaryOverride: 9000 });
rec = await call("GET", `/api/months/${thisMonth}`);
check("saving an override keeps the target", rec.body.targetBudget === 2000, rec.body);
check("override applied", rec.body.salaryOverride === 9000, rec.body);

await call("POST", `/api/months/${thisMonth}/addons`, { label: "Bonus", amount: 500 });
await call("PUT", `/api/months/${thisMonth}`, { targetBudget: 2500 });
rec = await call("GET", `/api/months/${thisMonth}`);
check("saving a target keeps the override", rec.body.salaryOverride === 9000, rec.body);
check("saving a target keeps the add-ons", rec.body.addOns?.length === 1, rec.body.addOns);
check("target updated", rec.body.targetBudget === 2500, rec.body);

console.log("\n== clearing the target ==");
await call("PUT", `/api/months/${thisMonth}`, { targetBudget: null });
rec = await call("GET", `/api/months/${thisMonth}`);
check("null clears the target", rec.body.targetBudget === undefined, rec.body);
check("clearing kept the override", rec.body.salaryOverride === 9000, rec.body);
sum2 = (await call("GET", `/api/months/${thisMonth}/summary`)).body;
check("pace falls back to the budget again", sum2.pace.custom === false, sum2.pace);

console.log("\n== junk targets are refused, not stored ==");
for (const bad of [0, -5, "x", null === null ? Number.NaN : 0]) {
  await call("PUT", `/api/months/${thisMonth}`, { targetBudget: bad });
  const got = (await call("GET", `/api/months/${thisMonth}`)).body.targetBudget;
  check(`${JSON.stringify(bad) ?? "NaN"} ignored`, got === undefined, got);
}

console.log("\n== advisor ==");
const thread = await call("GET", "/api/advisor");
check("thread readable", thread.status === 200);
check("starters present", Array.isArray(thread.body.starters) && thread.body.starters.length > 0);
check("empty question rejected",
  (await call("POST", "/api/advisor/messages", { text: "  " })).status === 400);
check("overlong question rejected",
  (await call("POST", "/api/advisor/messages", { text: "x".repeat(2100) })).status === 400);

// A .env in the project root supplies a key even when the variable is unset,
// so assert whichever branch is actually in effect rather than assuming one.
if (thread.body.enabled) {
  console.log("  (a GEMINI_API_KEY is configured, so checking the live path)");
  const asked = await call("POST", "/api/advisor/messages", {
    text: "In one short sentence: am I on track this month?",
  });
  check(
    "a configured advisor either answers or fails gracefully",
    asked.status === 200
      ? typeof asked.body.reply?.text === "string" && asked.body.reply.text.length > 0
      : typeof asked.body.error === "string",
    { status: asked.status, body: asked.body },
  );
  if (asked.status === 200) {
    check("the exchange was persisted",
      (await call("GET", "/api/advisor")).body.messages.length >= 2);
  }
  await call("DELETE", "/api/advisor");
  check("thread cleared", (await call("GET", "/api/advisor")).body.messages.length === 0);
} else {
  console.log("  (no GEMINI_API_KEY, so checking the switched-off path)");
  check("501 without a key",
    (await call("POST", "/api/advisor/messages", { text: "Can I afford a laptop?" })).status === 501);
  check("nothing persisted", (await call("GET", "/api/advisor")).body.messages.length === 0);
}
const ctx = await call("GET", "/api/advisor/context");
check("snapshot builds", ctx.status === 200 && ctx.body.snapshot.includes("CURRENCY"));
// Assert against the live figure rather than a literal, so earlier sections
// changing the salary cannot silently break this.
const liveIncome = String(
  (await call("GET", `/api/months/${new Date().toISOString().slice(0, 7)}/summary`)).body.income.total,
);
check(
  `snapshot carries real figures (income ${liveIncome})`,
  ctx.body.snapshot.includes(liveIncome),
  ctx.body.snapshot.slice(0, 200),
);
check("snapshot states the spending target", /spending target/i.test(ctx.body.snapshot));
check("snapshot lists commitments", ctx.body.snapshot.includes("Internet"));

console.log("\n== 404 for unknown routes ==");
check("unknown path", (await call("GET", "/api/nope")).status === 404);
check("wrong method", (await call("DELETE", "/api/settings")).status === 404);

console.log("\n== delete a commitment ==");
check("delete ok", (await call("DELETE", `/api/commitments/${net.body.id}`)).status === 200);
check("two remain", (await call("GET", "/api/commitments")).body.length === 2);

await reset();
await store.close();
console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
