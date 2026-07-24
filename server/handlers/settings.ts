import type { Settings } from "../../shared/types.ts";
import { settingsKey } from "../lib/kv.ts";
import { getSettings } from "../lib/aggregate.ts";
import { json } from "../lib/http.ts";

export async function getSettingsHandler(_req: Request, kv: Deno.Kv): Promise<Response> {
  const settings = await getSettings(kv);
  return json(settings);
}

export async function putSettingsHandler(req: Request, kv: Deno.Kv): Promise<Response> {
  const body = (await req.json()) as Settings;
  if (typeof body.defaultMonthlySalary !== "number" || !Number.isFinite(body.defaultMonthlySalary)) {
    return json({ error: "defaultMonthlySalary must be a number" }, 400);
  }
  const settings: Settings = {
    defaultMonthlySalary: body.defaultMonthlySalary,
    currency: body.currency || "GHS",
  };
  await kv.set(settingsKey(), settings);
  return json(settings);
}
