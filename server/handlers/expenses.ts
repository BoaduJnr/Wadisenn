import type { Expense } from "../../shared/types.ts";
import { expenseKey } from "../lib/kv.ts";
import { listExpenses } from "../lib/aggregate.ts";
import { json } from "../lib/http.ts";
import { ulid } from "../lib/ulid.ts";

export async function listExpensesHandler(_req: Request, kv: Deno.Kv, params: Record<string, string>): Promise<Response> {
  const expenses = await listExpenses(kv, params.month);
  return json(expenses);
}

export async function createExpenseHandler(
  req: Request,
  kv: Deno.Kv,
  params: Record<string, string>,
): Promise<Response> {
  const body = (await req.json()) as { date: string; amount: number; category: string; note?: string };
  if (!body.date || typeof body.amount !== "number" || !Number.isFinite(body.amount) || !body.category) {
    return json({ error: "date, amount, and category are required" }, 400);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = ulid();
    const expense: Expense = {
      id,
      month: params.month,
      date: body.date,
      amount: body.amount,
      category: body.category,
      note: body.note,
      createdAt: new Date().toISOString(),
    };
    const key = expenseKey(params.month, id);
    const result = await kv.atomic().check({ key, versionstamp: null }).set(key, expense).commit();
    if (result.ok) return json(expense, 201);
  }
  return json({ error: "failed to create expense, please retry" }, 500);
}

export async function updateExpenseHandler(
  req: Request,
  kv: Deno.Kv,
  params: Record<string, string>,
): Promise<Response> {
  const key = expenseKey(params.month, params.id);
  const existing = await kv.get<Expense>(key);
  if (!existing.value) return json({ error: "expense not found" }, 404);

  const body = (await req.json()) as Partial<Pick<Expense, "date" | "amount" | "category" | "note">>;
  const updated: Expense = {
    ...existing.value,
    date: body.date ?? existing.value.date,
    amount: body.amount ?? existing.value.amount,
    category: body.category ?? existing.value.category,
    note: body.note ?? existing.value.note,
  };
  await kv.set(key, updated);
  return json(updated);
}

export async function deleteExpenseHandler(
  _req: Request,
  kv: Deno.Kv,
  params: Record<string, string>,
): Promise<Response> {
  await kv.delete(expenseKey(params.month, params.id));
  return json({ ok: true });
}
