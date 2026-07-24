import { useCallback, useEffect, useState } from "react";
import { listExpenses } from "../api";
import type { Expense } from "../types";

export function useExpenses(month: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    listExpenses(month)
      .then(setExpenses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { expenses, loading, error, refetch };
}
