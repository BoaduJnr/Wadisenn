import { useCallback, useEffect, useState } from "react";
import { getRates, refreshRates } from "../api";
import type { RatesResponse } from "../types";

export function useRates() {
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    getRates()
      .then(setRates)
      // A rate lookup failing must never take the rest of the app down with
      // it; amounts simply stay in the base currency.
      .catch(() => setRates(null))
      .finally(() => setLoading(false));
  }, []);

  /** Pull straight from the provider, bypassing the cache window. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setRates(await refreshRates());
    } catch {
      /* keep whatever we already had */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rates, loading, refreshing, refetch, refresh };
}
