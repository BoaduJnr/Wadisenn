import type { Loan, LoanRepayment } from "../../shared/types.ts";
import { round2 } from "../../shared/commitments.ts";
import { loanKey } from "../lib/keys.ts";
import { listLoans } from "../lib/aggregate.ts";
import { isValidDate, json } from "../lib/http.ts";
import { ulid } from "../lib/ulid.ts";
import type { Store } from "../lib/store.ts";

interface LoanInput {
  person?: string;
  amount?: number;
  date?: string;
  dueDate?: string | null;
  note?: string | null;
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Normalises a request body into the editable part of a Loan, or returns the
 * reason it cannot be. `repaid` is what has already come back, so an edit can
 * never shrink a loan below the money already returned against it.
 */
function validate(
  body: LoanInput,
  repaid = 0,
): { loan: Omit<Loan, "id" | "createdAt" | "repayments"> } | { error: string } {
  const person = body.person?.trim().replace(/\s+/g, " ");
  if (!person) return { error: "person is required" };

  if (!isPositiveAmount(body.amount)) return { error: "amount must be a number greater than 0" };
  if (body.amount < repaid) return { error: `amount cannot be less than the ${round2(repaid)} already repaid` };

  if (!body.date || !isValidDate(body.date)) return { error: "date is required, expected YYYY-MM-DD" };

  const dueDate = body.dueDate || undefined;
  if (dueDate) {
    if (!isValidDate(dueDate)) return { error: "dueDate must be YYYY-MM-DD" };
    if (dueDate < body.date) return { error: "dueDate cannot be before the date it was lent" };
  }

  return {
    loan: {
      person,
      amount: body.amount,
      date: body.date,
      dueDate,
      note: body.note?.trim() || undefined,
    },
  };
}

function repaidOf(loan: Loan): number {
  return round2(loan.repayments.reduce((sum, r) => sum + r.amount, 0));
}

export async function listLoansHandler(_req: Request, kv: Store): Promise<Response> {
  return json(await listLoans(kv));
}

export async function createLoanHandler(req: Request, kv: Store): Promise<Response> {
  const result = validate((await req.json()) as LoanInput);
  if ("error" in result) return json({ error: result.error }, 400);

  // Insert-if-absent so a ULID collision can never overwrite another loan.
  for (let attempt = 0; attempt < 3; attempt++) {
    const loan: Loan = {
      ...result.loan,
      id: ulid(),
      repayments: [],
      createdAt: new Date().toISOString(),
    };
    if (await kv.insertIfAbsent(loanKey(loan.id), loan)) return json(loan, 201);
  }
  return json({ error: "failed to create loan, please retry" }, 500);
}

export async function updateLoanHandler(req: Request, kv: Store, params: Record<string, string>): Promise<Response> {
  const key = loanKey(params.id);
  const existing = await kv.get<Loan>(key);
  if (!existing.value) return json({ error: "loan not found" }, 404);

  const body = (await req.json()) as LoanInput;
  // Merged onto what is stored and validated as a whole, as commitments are.
  const result = validate(
    {
      person: body.person ?? existing.value.person,
      amount: body.amount ?? existing.value.amount,
      date: body.date ?? existing.value.date,
      dueDate: body.dueDate !== undefined ? body.dueDate : existing.value.dueDate,
      note: body.note !== undefined ? body.note : existing.value.note,
    },
    repaidOf(existing.value),
  );
  if ("error" in result) return json({ error: result.error }, 400);

  const updated: Loan = {
    ...result.loan,
    id: existing.value.id,
    repayments: existing.value.repayments,
    createdAt: existing.value.createdAt,
  };
  await kv.set(key, updated);
  return json(updated);
}

export async function deleteLoanHandler(_req: Request, kv: Store, params: Record<string, string>): Promise<Response> {
  await kv.delete(loanKey(params.id));
  return json({ ok: true });
}

export async function createRepaymentHandler(
  req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const key = loanKey(params.id);
  const existing = await kv.get<Loan>(key);
  if (!existing.value) return json({ error: "loan not found" }, 404);

  const body = (await req.json()) as { amount?: number; date?: string; note?: string };
  if (!isPositiveAmount(body.amount)) return json({ error: "amount must be a number greater than 0" }, 400);
  if (!body.date || !isValidDate(body.date)) return json({ error: "date is required, expected YYYY-MM-DD" }, 400);

  // Refused rather than capped: an overpayment is almost always a typo, and
  // silently trimming it would record a figure the user never entered.
  const outstanding = round2(existing.value.amount - repaidOf(existing.value));
  if (round2(body.amount) > outstanding) {
    return json({ error: `repayment is more than the ${outstanding} still owed` }, 400);
  }

  const repayment: LoanRepayment = {
    id: ulid(),
    amount: body.amount,
    date: body.date,
    note: body.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const repayments = [...existing.value.repayments, repayment].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
  const updated: Loan = { ...existing.value, repayments };
  await kv.set(key, updated);
  return json(updated, 201);
}

export async function deleteRepaymentHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const key = loanKey(params.id);
  const existing = await kv.get<Loan>(key);
  if (!existing.value) return json({ error: "loan not found" }, 404);

  const updated: Loan = {
    ...existing.value,
    repayments: existing.value.repayments.filter((r) => r.id !== params.repaymentId),
  };
  await kv.set(key, updated);
  return json(updated);
}
