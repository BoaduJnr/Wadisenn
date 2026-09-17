import { getRates } from "../lib/rates.ts";
import { getSettings } from "../lib/aggregate.ts";
import { json } from "../lib/http.ts";
import type { Store } from "../lib/store.ts";

/** Rates are always quoted against the stored base currency from settings. */
export async function getRatesHandler(_req: Request, kv: Store): Promise<Response> {
  const settings = await getSettings(kv);
  return json(await getRates(kv, settings.currency));
}

export async function refreshRatesHandler(_req: Request, kv: Store): Promise<Response> {
  const settings = await getSettings(kv);
  return json(await getRates(kv, settings.currency, { force: true }));
}
