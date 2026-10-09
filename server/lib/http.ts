export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      /*
       * A response with no Cache-Control and no validator can still be reused
       * by a browser under heuristic freshness. These are live financial
       * figures, so a stale read is a wrong answer rather than a slow one —
       * every API response is explicitly uncacheable.
       */
      "cache-control": "no-store",
    },
  });
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export function isValidMonth(month: string): boolean {
  return MONTH_RE.test(month);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" that is also a real calendar day, so 2026-02-30 is refused. */
export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
