import type { Expense } from "../../shared/types.ts";
import { expenseKey } from "../lib/keys.ts";
import { listExpenses } from "../lib/aggregate.ts";
import { json } from "../lib/http.ts";
import { ulid } from "../lib/ulid.ts";
import type { Store } from "../lib/store.ts";

export async function listExpensesHandler(_req: Request, kv: Store, params: Record<string, string>): Promise<Response> {
  const expenses = await listExpenses(kv, params.month);
  return json(expenses);
}

export async function createExpenseHandler(
  req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const body = (await req.json()) as { date: string; amount: number; category: string; note?: string };
  if (!body.date || typeof body.amount !== "number" || !Number.isFinite(body.amount) || !body.category) {
    return json({ error: "date, amount, and category are required" }, 400);
  }

  // Insert-if-absent rather than a plain write, so a ULID collision can never
  // silently overwrite an existing expense. Retried a couple of times because
  // losing the race is recoverable by simply picking another id.
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
    if (await kv.insertIfAbsent(expenseKey(params.month, id), expense)) {
      return json(expense, 201);
    }
  }
  return json({ error: "failed to create expense, please retry" }, 500);
}

export async function updateExpenseHandler(
  req: Request,
  kv: Store,
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
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  await kv.delete(expenseKey(params.month, params.id));
  return json({ ok: true });
}
