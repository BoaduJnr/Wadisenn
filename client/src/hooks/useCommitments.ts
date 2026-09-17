import { useCallback, useEffect, useState } from "react";
import { listCommitments } from "../api";
import type { Commitment } from "../types";

export function useCommitments() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    listCommitments()
      .then(setCommitments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { commitments, loading, error, refetch };
}
