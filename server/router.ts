import { getSettingsHandler, putSettingsHandler } from "./handlers/settings.ts";
import {
  deleteAddOnHandler,
  getMonthHandler,
  getMonthSummaryHandler,
  listMonthsHandler,
  postAddOnHandler,
  putMonthHandler,
} from "./handlers/months.ts";
import {
  createExpenseHandler,
  deleteExpenseHandler,
  listExpensesHandler,
  updateExpenseHandler,
} from "./handlers/expenses.ts";
import { isValidMonth, json } from "./lib/http.ts";

type Handler = (req: Request, kv: Deno.Kv, params: Record<string, string>) => Promise<Response>;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
}

const routes: Route[] = [
  { method: "GET", pattern: new URLPattern({ pathname: "/api/settings" }), handler: getSettingsHandler },
  { method: "PUT", pattern: new URLPattern({ pathname: "/api/settings" }), handler: putSettingsHandler },

  { method: "GET", pattern: new URLPattern({ pathname: "/api/months" }), handler: listMonthsHandler },
  { method: "GET", pattern: new URLPattern({ pathname: "/api/months/:month" }), handler: getMonthHandler },
  { method: "PUT", pattern: new URLPattern({ pathname: "/api/months/:month" }), handler: putMonthHandler },

  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/api/months/:month/addons" }),
    handler: postAddOnHandler,
  },
  {
    method: "DELETE",
    pattern: new URLPattern({ pathname: "/api/months/:month/addons/:id" }),
    handler: deleteAddOnHandler,
  },

  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/api/months/:month/summary" }),
    handler: getMonthSummaryHandler,
  },

  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/api/months/:month/expenses" }),
    handler: listExpensesHandler,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/api/months/:month/expenses" }),
    handler: createExpenseHandler,
  },
  {
    method: "PUT",
    pattern: new URLPattern({ pathname: "/api/months/:month/expenses/:id" }),
    handler: updateExpenseHandler,
  },
  {
    method: "DELETE",
    pattern: new URLPattern({ pathname: "/api/months/:month/expenses/:id" }),
    handler: deleteExpenseHandler,
  },
];

export async function handleApiRequest(req: Request, kv: Deno.Kv): Promise<Response> {
  const url = new URL(req.url);

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const match = route.pattern.exec(url);
    if (!match) continue;

    const params = match.pathname.groups as Record<string, string>;
    if (params.month && !isValidMonth(params.month)) {
      return json({ error: "invalid month, expected YYYY-MM" }, 400);
    }

    try {
      return await route.handler(req, kv, params);
    } catch (err) {
      console.error(err);
      return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
    }
  }

  return json({ error: "not found" }, 404);
}
