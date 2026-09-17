import type { MarketContext, Settings } from "../../shared/types.ts";
import { settingsKey } from "../lib/keys.ts";
import { getSettings } from "../lib/aggregate.ts";
import { json } from "../lib/http.ts";
import type { Store } from "../lib/store.ts";

/** A percentage the user typed, or undefined if it is not a sane figure. */
function normaliseRate(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > 1000) return undefined;
  return Math.round(value * 100) / 100;
}

function normaliseMarket(value: unknown): MarketContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const market: MarketContext = {
    tbillRate: normaliseRate(input.tbillRate),
    inflation: normaliseRate(input.inflation),
    loanApr: normaliseRate(input.loanApr),
  };
  const hasAny = market.tbillRate !== undefined || market.inflation !== undefined ||
    market.loanApr !== undefined;
  if (!hasAny) return undefined;
  // Stamped server-side so the advisor can say how old the figures are. An
  // incoming date is kept, so saving unrelated settings does not make stale
  // rates look freshly checked.
  const incoming = input.updatedAt;
  market.updatedAt = typeof incoming === "string" && /^\d{4}-\d{2}-\d{2}$/.test(incoming)
    ? incoming
    : new Date().toISOString().slice(0, 10);
  return market;
}

/** ISO 4217 codes are three letters; anything else is treated as unset. */
function normaliseCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
}

export async function getSettingsHandler(_req: Request, kv: Store): Promise<Response> {
  const settings = await getSettings(kv);
  return json(settings);
}

export async function putSettingsHandler(req: Request, kv: Store): Promise<Response> {
  const body = (await req.json()) as Settings;
  if (typeof body.defaultMonthlySalary !== "number" || !Number.isFinite(body.defaultMonthlySalary)) {
    return json({ error: "defaultMonthlySalary must be a number" }, 400);
  }
  const currency = normaliseCode(body.currency) ?? "GHS";
  const display = normaliseCode(body.displayCurrency);

  const settings: Settings = {
    defaultMonthlySalary: body.defaultMonthlySalary,
    currency,
    // Storing the display currency only when it differs keeps "no conversion"
    // as the absence of a value rather than a second way of saying the same.
    displayCurrency: display && display !== currency ? display : undefined,
    marketContext: normaliseMarket(body.marketContext),
  };
  await kv.set(settingsKey(), settings);
  return json(settings);
}
