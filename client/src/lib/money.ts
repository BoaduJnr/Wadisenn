import type { RatesResponse, Settings } from "../types";
import { formatCurrency } from "./format";

/**
 * Formats stored amounts for display, converting them when a display currency
 * is set.
 *
 * Every amount in KV is denominated in the base currency, so `format` is the
 * single point where conversion happens. Nothing upstream of it — stored
 * records, month summaries, chart geometry — is ever rate-dependent, which is
 * why a bad or missing rate can only ever affect a label.
 */
export interface Money {
  /** What the stored numbers mean. */
  base: string;
  /** What is actually being shown, which equals `base` when not converting. */
  display: string;
  /** base -> display multiplier; exactly 1 when not converting. */
  rate: number;
  converting: boolean;
  /** Rates are past their refresh window but still the best available. */
  stale: boolean;
  fetchedAt: string | null;
  /**
   * A display currency was chosen but no rate could be obtained for it, so
   * amounts are being shown in the base currency instead.
   */
  unavailable: boolean;
  convert(amountInBase: number): number;
  /** Full currency formatting, e.g. "$322.46". */
  format(amountInBase: number): string;
  /** Bare compact number for chart axes, e.g. "3.2K". */
  compact(amountInBase: number): string;
}

const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function build(
  base: string,
  display: string,
  rate: number,
  extras: Pick<Money, "stale" | "fetchedAt" | "unavailable">,
): Money {
  const convert = (amount: number) => (rate === 1 ? amount : amount * rate);
  return {
    base,
    display,
    rate,
    converting: display !== base,
    convert,
    format: (amount) => formatCurrency(convert(amount), display),
    compact: (amount) => COMPACT.format(convert(amount)),
    ...extras,
  };
}

export function createMoney(settings: Settings | null, rates: RatesResponse | null): Money {
  const base = settings?.currency || "GHS";
  const wanted = settings?.displayCurrency;

  // No display currency, or one that is just the base again: show as stored.
  if (!wanted || wanted === base) {
    return build(base, base, 1, { stale: false, fetchedAt: null, unavailable: false });
  }

  const rate = rates?.rates?.[wanted];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    // Fall back to the base currency rather than invent a number. Stale rates
    // are still used (see below) — this branch is only for having none at all.
    return build(base, base, 1, {
      stale: false,
      fetchedAt: rates?.fetchedAt ?? null,
      unavailable: true,
    });
  }

  return build(base, wanted, rate, {
    stale: rates?.stale ?? false,
    fetchedAt: rates?.fetchedAt ?? null,
    unavailable: false,
  });
}

/** Currency codes offered by the picker: the base first, then the rest. */
export function selectableCurrencies(base: string, rates: RatesResponse | null): string[] {
  const codes = Object.keys(rates?.rates ?? {})
    .filter((code) => code !== base)
    .sort();
  return [base, ...codes];
}

/** "Rates from 17 Sep 2026", or null when nothing has been fetched. */
export function ratesAsOf(fetchedAt: string | null): string | null {
  if (!fetchedAt) return null;
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
