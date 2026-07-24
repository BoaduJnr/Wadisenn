export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export function isValidMonth(month: string): boolean {
  return MONTH_RE.test(month);
}
