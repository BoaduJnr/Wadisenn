import { useCallback, useEffect, useState } from "react";
import { getYearCommitments } from "../api";
import type { YearCommitments } from "../types";

export function useYearCommitments(year: number) {
  const [year_, setYear] = useState<YearCommitments | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    getYearCommitments(year)
      .then(setYear)
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { year: year_, loading, refetch };
}
