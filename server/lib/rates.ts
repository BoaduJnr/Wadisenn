import type { RateSnapshot, RatesResponse } from "../../shared/types.ts";
import { ratesKey } from "./keys.ts";
import type { Store } from "./store.ts";

const PROVIDER = "open.er-api.com";
const ENDPOINT = "https://open.er-api.com/v6/latest";

/** Rates are published about once a day, so refreshing more often is wasted. */
const FRESH_FOR_MS = 12 * 60 * 60 * 1000;

/** After a failed fetch, stop hammering the provider on every request. */
const RETRY_AFTER_FAILURE_MS = 10 * 60 * 1000;

/**
 * Per-process backoff. Deliberately not in KV: a failure is about the network
 * right now, not a fact about the data, and it must never overwrite a good
 * snapshot that is still serving conversions.
 */
const lastFailureAt = new Map<string, number>();

interface ProviderPayload {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  "error-type"?: string;
}

function isStale(snapshot: RateSnapshot, now: number): boolean {
  return now - new Date(snapshot.fetchedAt).getTime() > FRESH_FOR_MS;
}

async function fetchSnapshot(base: string): Promise<RateSnapshot | null> {
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(base)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.warn(`rates: ${PROVIDER} returned ${res.status} for ${base}`);
      return null;
    }

    const payload = (await res.json()) as ProviderPayload;
    if (payload.result !== "success" || !payload.rates) {
      console.warn(`rates: ${PROVIDER} rejected ${base}: ${payload["error-type"] ?? "unknown"}`);
      return null;
    }

    // Keep only finite positive numbers — a malformed entry would otherwise
        // produce silently wrong money on screen.
    const rates: Record<string, number> = {};
    for (const [code, value] of Object.entries(payload.rates)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) rates[code] = value;
    }
    if (Object.keys(rates).length === 0) return null;

    return {
      base: payload.base_code ?? base,
      rates,
      fetchedAt: new Date().toISOString(),
      provider: PROVIDER,
    };
  } catch (err) {
    console.warn(`rates: fetch failed for ${base}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * The rate table for `base`, refreshed when it has aged out.
 *
 * Never throws and never blocks on a dead network for long: if a refresh
 * fails, the cached snapshot is returned marked stale so the UI can keep
 * converting and say how old the numbers are. Only when nothing has ever been
 * cached does this report unavailable.
 */
export async function getRates(
  kv: Store,
  base: string,
  { force = false }: { force?: boolean } = {},
): Promise<RatesResponse> {
  const now = Date.now();
  const cached = (await kv.get<RateSnapshot>(ratesKey(base))).value;

  const aged = !cached || isStale(cached, now);
  const backedOff = (now - (lastFailureAt.get(base) ?? 0)) < RETRY_AFTER_FAILURE_MS;

  if (force || (aged && !backedOff)) {
    const fresh = await fetchSnapshot(base);
    if (fresh) {
      lastFailureAt.delete(base);
      await kv.set(ratesKey(base), fresh);
      return { base, rates: fresh.rates, fetchedAt: fresh.fetchedAt, stale: false, available: true };
    }
    lastFailureAt.set(base, now);
  }

  if (cached) {
    return {
      base,
      rates: cached.rates,
      fetchedAt: cached.fetchedAt,
      stale: isStale(cached, now),
      available: true,
    };
  }

  return { base, rates: {}, fetchedAt: null, stale: false, available: false };
}
