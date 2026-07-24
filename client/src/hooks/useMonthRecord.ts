import { useCallback, useEffect, useState } from "react";
import { getMonthRecord } from "../api";
import type { MonthRecord } from "../types";

export function useMonthRecord(month: string) {
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    getMonthRecord(month)
      .then(setRecord)
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { record, loading, refetch };
}
