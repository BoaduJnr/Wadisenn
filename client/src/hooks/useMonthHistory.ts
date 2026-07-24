import { useCallback, useEffect, useState } from "react";
import { listMonthSummaries } from "../api";
import type { MonthSummary } from "../types";

export function useMonthHistory() {
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    listMonthSummaries()
      .then(setSummaries)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summaries, loading, refetch };
}
