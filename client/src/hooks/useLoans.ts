import { useCallback, useEffect, useState } from "react";
import { listLoans } from "../api";
import type { Loan } from "../types";

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    listLoans()
      .then(setLoans)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { loans, loading, error, refetch };
}
