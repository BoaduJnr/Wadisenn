import type { AddOn, MonthRecord } from "../../shared/types.ts";
import { monthKey, monthsPrefix } from "../lib/keys.ts";
import { computeMonthSummary } from "../lib/aggregate.ts";
import { json } from "../lib/http.ts";
import { ulid } from "../lib/ulid.ts";
import type { Store } from "../lib/store.ts";

async function getMonthRecord(kv: Store, month: string): Promise<MonthRecord> {
  const entry = await kv.get<MonthRecord>(monthKey(month));
  return entry.value ?? { month, addOns: [] };
}

export async function getMonthHandler(_req: Request, kv: Store, params: Record<string, string>): Promise<Response> {
  const record = await getMonthRecord(kv, params.month);
  return json(record);
}

export async function putMonthHandler(req: Request, kv: Store, params: Record<string, string>): Promise<Response> {
  const body = (await req.json()) as {
    salaryOverride?: number | null;
    addOns?: AddOn[];
    targetBudget?: number | null;
  };
  const existing = await getMonthRecord(kv, params.month);

  /*
   * Fields are merged onto what is stored rather than replaced wholesale: the
   * UI saves the salary override and the target from separate little forms, so
   * a strict replace would have each one silently wipe the other. An explicit
   * null clears a field; leaving it out keeps it.
   */
  const clearOrKeep = (incoming: number | null | undefined, current: number | undefined) => {
    if (incoming === null) return undefined;
    if (incoming === undefined) return current;
    return Number.isFinite(incoming) && incoming > 0 ? incoming : undefined;
  };

  const record: MonthRecord = {
    month: params.month,
    salaryOverride: body.salaryOverride === null
      ? undefined
      : body.salaryOverride ?? existing.salaryOverride,
    addOns: body.addOns ?? existing.addOns,
    targetBudget: clearOrKeep(body.targetBudget, existing.targetBudget),
  };
  await kv.set(monthKey(params.month), record);
  return json(record);
}

export async function postAddOnHandler(req: Request, kv: Store, params: Record<string, string>): Promise<Response> {
  const body = (await req.json()) as { label: string; amount: number };
  if (!body.label || typeof body.amount !== "number" || !Number.isFinite(body.amount)) {
    return json({ error: "label and amount are required" }, 400);
  }
  const record = await getMonthRecord(kv, params.month);
  const addOn: AddOn = {
    id: ulid(),
    label: body.label,
    amount: body.amount,
    createdAt: new Date().toISOString(),
  };
  record.addOns.push(addOn);
  await kv.set(monthKey(params.month), record);
  return json(addOn);
}

export async function deleteAddOnHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const record = await getMonthRecord(kv, params.month);
  record.addOns = record.addOns.filter((a) => a.id !== params.id);
  await kv.set(monthKey(params.month), record);
  return json({ ok: true });
}

export async function getMonthSummaryHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  const summary = await computeMonthSummary(kv, params.month);
  return json(summary);
}

export async function listMonthsHandler(_req: Request, kv: Store): Promise<Response> {
  const months = new Set<string>();
  for await (const entry of kv.list<MonthRecord>({ prefix: monthsPrefix() })) {
    months.add(entry.value.month);
  }
  for await (const entry of kv.list({ prefix: ["expenses"] })) {
    const month = entry.key[1] as string;
    months.add(month);
  }
  const summaries = await Promise.all(
    [...months].sort().reverse().map((month) => computeMonthSummary(kv, month)),
  );
  return json(summaries);
}
