# Wadisenn

A mobile-first spending tracker. Set a default monthly salary, add one-off
income for specific months (bonuses, freelance work), log expenses as you go,
and see how much you'll have left at month end plus how spending and savings
build up day by day.

## Stack

- **Backend:** [Deno](https://deno.com/) + [Deno KV](https://docs.deno.com/deploy/kv/manual/) for storage, no framework — a small hand-rolled router.
- **Frontend:** React + Vite + TypeScript + Tailwind CSS, charts via [recharts](https://recharts.org/).
- Single user, no login. Data lives locally in `./data/wadisenn.db`.

## Project layout

```
shared/types.ts       — types shared by client and server
server/
  main.ts              — entry point, serves the API and (in prod) the built client
  router.ts            — route table
  handlers/            — settings / months / expenses endpoints
  lib/                 — Deno KV helpers, ULID generator, month-summary math
client/
  src/
    api.ts             — fetch wrapper for the backend
    hooks/             — useSettings, useSummary, useExpenses, useMonthRecord, useMonthHistory
    components/        — BottomNav, MonthPicker, StatTile, ProgressBar, ExpenseForm, charts, ...
    views/             — Dashboard, Add, Expenses, Settings
data/                  — Deno KV database file (gitignored)
```

## Running it

Requires [Deno](https://deno.com/) and [Node.js](https://nodejs.org/) installed.

**Development** (hot reload, client on :5173 proxying `/api` to the Deno server on :8000):

```sh
deno task dev
```

**Production** (single process, one port):

```sh
deno task build   # builds client/dist
deno task start    # serves the API and the built client at http://localhost:8000
```

Other tasks: `deno task dev:server` / `deno task dev:client` run just one side.

## Data model (Deno KV)

- `["settings"]` — default monthly salary + currency
- `["months", "YYYY-MM"]` — that month's salary override (if any) + add-ons
- `["expenses", "YYYY-MM", "<ulid>"]` — one expense entry

All dashboard numbers (income, spent, remaining, projected end-of-month,
cumulative daily spend, month-over-month savings) are computed on read from
these records — see `server/lib/aggregate.ts`.
