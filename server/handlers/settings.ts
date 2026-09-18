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

/** A positive amount, or undefined if it is not one. */
function normaliseAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100) / 100;
}

type SettingsInput = Partial<Omit<Settings, "displayCurrency" | "marketContext">> & {
  displayCurrency?: string | null;
  marketContext?: MarketContext | null;
  defaultTargetBudget?: number | null;
};

/**
 * Fields are merged onto what is stored rather than replaced wholesale.
 *
 * Setup saves from several small independent forms — salary, display currency,
 * benchmark rates, default target — and a strict replace would have each one
 * silently wipe the others. An explicit null clears a field; leaving it out
 * keeps it.
 */
export async function putSettingsHandler(req: Request, kv: Store): Promise<Response> {
  const body = (await req.json()) as SettingsInput;
  const existing = await getSettings(kv);

  if (body.defaultMonthlySalary !== undefined) {
    if (typeof body.defaultMonthlySalary !== "number" || !Number.isFinite(body.defaultMonthlySalary)) {
      return json({ error: "defaultMonthlySalary must be a number" }, 400);
    }
  }

  const currency = body.currency === undefined
    ? existing.currency
    : normaliseCode(body.currency) ?? "GHS";

  let displayCurrency: string | undefined;
  if (body.displayCurrency === null) displayCurrency = undefined;
  else if (body.displayCurrency === undefined) displayCurrency = existing.displayCurrency;
  else displayCurrency = normaliseCode(body.displayCurrency);
  // "No conversion" is the absence of a value, never the base code repeated.
  if (displayCurrency === currency) displayCurrency = undefined;

  let marketContext: MarketContext | undefined;
  if (body.marketContext === null) marketContext = undefined;
  else if (body.marketContext === undefined) marketContext = existing.marketContext;
  else marketContext = normaliseMarket(body.marketContext);

  let defaultTargetBudget: number | undefined;
  if (body.defaultTargetBudget === null) defaultTargetBudget = undefined;
  else if (body.defaultTargetBudget === undefined) defaultTargetBudget = existing.defaultTargetBudget;
  else defaultTargetBudget = normaliseAmount(body.defaultTargetBudget);

  const settings: Settings = {
    defaultMonthlySalary: body.defaultMonthlySalary ?? existing.defaultMonthlySalary,
    currency,
    displayCurrency,
    marketContext,
    defaultTargetBudget,
  };
  await kv.set(settingsKey(), settings);
  return json(settings);
}
