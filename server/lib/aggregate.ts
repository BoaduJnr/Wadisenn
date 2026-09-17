import type { AddOn, Commitment, Expense, MonthSummary, Settings } from "../../shared/types.ts";
import { commitmentsForMonth, round2 } from "../../shared/commitments.ts";
import { commitmentsPrefix, expensesPrefix, monthKey, settingsKey } from "./keys.ts";
import type { Store } from "./store.ts";

export function daysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m, 0).getDate();
}

export function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.split("-")[2]);
}

export async function getSettings(kv: Store): Promise<Settings> {
  const entry = await kv.get<Settings>(settingsKey());
  return entry.value ?? { defaultMonthlySalary: 0, currency: "GHS" };
}

export async function listExpenses(kv: Store, month: string): Promise<Expense[]> {
  const expenses: Expense[] = [];
  for await (const entry of kv.list<Expense>({ prefix: expensesPrefix(month) })) {
    expenses.push(entry.value);
  }
  expenses.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return expenses;
}

export async function listCommitments(kv: Store): Promise<Commitment[]> {
  const commitments: Commitment[] = [];
  for await (const entry of kv.list<Commitment>({ prefix: commitmentsPrefix() })) {
    commitments.push(entry.value);
  }
  commitments.sort(
    (a, b) =>
      a.cadence.localeCompare(b.cadence) || b.amount - a.amount || a.label.localeCompare(b.label),
  );
  return commitments;
}

export async function computeMonthSummary(kv: Store, month: string): Promise<MonthSummary> {
  const [settings, monthRecordEntry, expenses, allCommitments] = await Promise.all([
    getSettings(kv),
    kv.get<{ month: string; salaryOverride?: number; addOns: AddOn[] }>(monthKey(month)),
    listExpenses(kv, month),
    listCommitments(kv),
  ]);

  const monthRecord = monthRecordEntry.value ?? { month, addOns: [] };
  const base = monthRecord.salaryOverride ?? settings.defaultMonthlySalary;
  const addOnsTotal = monthRecord.addOns.reduce((sum, a) => sum + a.amount, 0);
  const incomeTotal = base + addOnsTotal;

  // Fixed commitments come out of income before any logged spending counts, so
  // "budget" is the discretionary slice and "remaining" is what is truly free.
  const commitments = commitmentsForMonth(allCommitments, month);
  const budget = round2(incomeTotal - commitments.total);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDays = daysInMonth(month);

  const perDaySpend = new Map<number, number>();
  for (const e of expenses) {
    const day = dayOfMonth(e.date);
    perDaySpend.set(day, (perDaySpend.get(day) ?? 0) + e.amount);
  }

  const dailyCumulative: { day: number; cumulativeSpent: number }[] = [];
  let running = 0;
  for (let day = 1; day <= totalDays; day++) {
    running += perDaySpend.get(day) ?? 0;
    dailyCumulative.push({ day, cumulativeSpent: running });
  }

  const isCurrentMonth = month === currentMonthString();
  const today = isCurrentMonth ? new Date().getDate() : null;

  let projectedTotalSpend: number | null = null;
  let projectedRemaining: number | null = null;
  if (isCurrentMonth && today) {
    const daysElapsed = Math.min(today, totalDays);
    const avgDailySpend = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    projectedTotalSpend = avgDailySpend * totalDays;
    projectedRemaining = budget - projectedTotalSpend;
  }

  return {
    month,
    income: { base, addOns: monthRecord.addOns, total: incomeTotal },
    commitments,
    budget,
    totalSpent,
    remaining: round2(budget - totalSpent),
    dailyCumulative,
    isCurrentMonth,
    projectedTotalSpend,
    projectedRemaining,
    daysInMonth: totalDays,
    today,
  };
}
