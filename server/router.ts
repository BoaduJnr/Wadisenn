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
  createCommitmentHandler,
  deleteCommitmentHandler,
  getYearCommitmentsHandler,
  listCommitmentsHandler,
  updateCommitmentHandler,
} from "./handlers/commitments.ts";
import {
  createExpenseHandler,
  deleteExpenseHandler,
  listExpensesHandler,
  updateExpenseHandler,
} from "./handlers/expenses.ts";
import {
  deleteAdvisorThreadHandler,
  getAdvisorContextHandler,
  getAdvisorThreadHandler,
  postAdvisorMessageHandler,
} from "./handlers/advisor.ts";
import { getRatesHandler, refreshRatesHandler } from "./handlers/rates.ts";
import { isValidMonth, json } from "./lib/http.ts";
import type { Store } from "./lib/store.ts";

type Handler = (req: Request, kv: Store, params: Record<string, string>) => Promise<Response>;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
}

const routes: Route[] = [
  { method: "GET", pattern: new URLPattern({ pathname: "/api/settings" }), handler: getSettingsHandler },
  { method: "PUT", pattern: new URLPattern({ pathname: "/api/settings" }), handler: putSettingsHandler },

  { method: "GET", pattern: new URLPattern({ pathname: "/api/advisor" }), handler: getAdvisorThreadHandler },
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/api/advisor/context" }),
    handler: getAdvisorContextHandler,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/api/advisor/messages" }),
    handler: postAdvisorMessageHandler,
  },
  {
    method: "DELETE",
    pattern: new URLPattern({ pathname: "/api/advisor" }),
    handler: deleteAdvisorThreadHandler,
  },

  { method: "GET", pattern: new URLPattern({ pathname: "/api/rates" }), handler: getRatesHandler },
  { method: "POST", pattern: new URLPattern({ pathname: "/api/rates/refresh" }), handler: refreshRatesHandler },

  { method: "GET", pattern: new URLPattern({ pathname: "/api/commitments" }), handler: listCommitmentsHandler },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/api/commitments" }),
    handler: createCommitmentHandler,
  },
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/api/commitments/year/:year" }),
    handler: getYearCommitmentsHandler,
  },
  {
    method: "PUT",
    pattern: new URLPattern({ pathname: "/api/commitments/:id" }),
    handler: updateCommitmentHandler,
  },
  {
    method: "DELETE",
    pattern: new URLPattern({ pathname: "/api/commitments/:id" }),
    handler: deleteCommitmentHandler,
  },

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

export async function handleApiRequest(req: Request, kv: Store): Promise<Response> {
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
