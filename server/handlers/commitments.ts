import type { Cadence, Commitment } from "../../shared/types.ts";
import { commitmentsForYear } from "../../shared/commitments.ts";
import { commitmentKey } from "../lib/keys.ts";
import { listCommitments } from "../lib/aggregate.ts";
import { isValidMonth, json } from "../lib/http.ts";
import { ulid } from "../lib/ulid.ts";
import type { Store } from "../lib/store.ts";

interface CommitmentInput {
  label?: string;
  amount?: number;
  cadence?: Cadence;
  category?: string;
  dueDay?: number | null;
  dueMonth?: number | null;
  spread?: boolean;
  startMonth?: string;
  endMonth?: string | null;
}

/**
 * Normalises a request body into a stored Commitment, or returns the reason it
 * cannot be. Cadence decides which of the timing fields are meaningful, so the
 * ones that do not apply are dropped rather than stored as dead data.
 */
function validate(body: CommitmentInput): { commitment: Omit<Commitment, "id" | "createdAt"> } | { error: string } {
  const label = body.label?.trim();
  if (!label) return { error: "label is required" };

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return { error: "amount must be a number greater than 0" };
  }

  if (body.cadence !== "monthly" && body.cadence !== "yearly") {
    return { error: "cadence must be 'monthly' or 'yearly'" };
  }

  if (!body.startMonth || !isValidMonth(body.startMonth)) {
    return { error: "startMonth is required, expected YYYY-MM" };
  }

  const endMonth = body.endMonth ?? undefined;
  if (endMonth) {
    if (!isValidMonth(endMonth)) return { error: "endMonth must be YYYY-MM" };
    if (endMonth < body.startMonth) return { error: "endMonth cannot be before startMonth" };
  }

  const commitment: Omit<Commitment, "id" | "createdAt"> = {
    label,
    amount: body.amount,
    cadence: body.cadence,
    category: body.category?.trim() || "Bills",
    startMonth: body.startMonth,
    endMonth,
  };

  if (body.cadence === "monthly") {
    const dueDay = body.dueDay ?? undefined;
    if (dueDay !== undefined) {
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        return { error: "dueDay must be a whole number between 1 and 31" };
      }
      commitment.dueDay = dueDay;
    }
  } else {
    const dueMonth = body.dueMonth ?? undefined;
    if (dueMonth !== undefined && (!Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12)) {
      return { error: "dueMonth must be a whole number between 1 and 12" };
    }
    commitment.dueMonth = dueMonth ?? Number(body.startMonth.split("-")[1]);
    commitment.spread = Boolean(body.spread);
  }

  return { commitment };
}

export async function listCommitmentsHandler(_req: Request, kv: Store): Promise<Response> {
  return json(await listCommitments(kv));
}

export async function createCommitmentHandler(req: Request, kv: Store): Promise<Response> {
  const result = validate((await req.json()) as CommitmentInput);
  if ("error" in result) return json({ error: result.error }, 400);

  const commitment: Commitment = {
    ...result.commitment,
    id: ulid(),
    createdAt: new Date().toISOString(),
  };
  await kv.set(commitmentKey(commitment.id), commitment);
  return json(commitment, 201);
}

export async function updateCommitmentHandler(
  req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const key = commitmentKey(params.id);
  const existing = await kv.get<Commitment>(key);
  if (!existing.value) return json({ error: "commitment not found" }, 404);

  const body = (await req.json()) as CommitmentInput;
  // A partial update is merged onto what is stored, then validated as a whole,
  // so an edit can never leave a commitment in a state a create would reject.
  const result = validate({
    label: body.label ?? existing.value.label,
    amount: body.amount ?? existing.value.amount,
    cadence: body.cadence ?? existing.value.cadence,
    category: body.category ?? existing.value.category,
    dueDay: body.dueDay !== undefined ? body.dueDay : existing.value.dueDay,
    dueMonth: body.dueMonth !== undefined ? body.dueMonth : existing.value.dueMonth,
    spread: body.spread !== undefined ? body.spread : existing.value.spread,
    startMonth: body.startMonth ?? existing.value.startMonth,
    endMonth: body.endMonth !== undefined ? body.endMonth : existing.value.endMonth,
  });
  if ("error" in result) return json({ error: result.error }, 400);

  const updated: Commitment = {
    ...result.commitment,
    id: existing.value.id,
    createdAt: existing.value.createdAt,
  };
  await kv.set(key, updated);
  return json(updated);
}

export async function deleteCommitmentHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  await kv.delete(commitmentKey(params.id));
  return json({ ok: true });
}

export async function getYearCommitmentsHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return json({ error: "invalid year, expected YYYY" }, 400);
  }
  return json(commitmentsForYear(await listCommitments(kv), year));
}
