# Wadisenn

A mobile-first spending tracker built around the money that is already
promised. Set a default monthly salary, list the fixed costs that repeat — rent
and bills monthly, insurance and renewals yearly — and Wadisenn deducts them
before any day-to-day spending is counted. What is left is the discretionary
budget you actually draw down, so "left to spend" is an honest number.

The month reads as a statement:

```
Income            5,000
Fixed monthly   − 1,630
Fixed yearly    −   150
─────────────────────────
Spendable         3,220
Spent so far    − 1,160
─────────────────────────
Left              2,060
```

A yearly cost either lands whole in the month it falls due, or — if you spread
it — reserves a twelfth of itself every month so no single month takes the hit.

It also has a **money advisor**: a chat that reads your actual figures and
answers questions about purchases, loans either way, and where to put savings,
reasoning within Ghanaian conditions. It is optional, and off unless a
`GEMINI_API_KEY` is set.

## Stack

- **Backend:** [Node.js](https://nodejs.org/) 24 + TypeScript, run directly
  (Node strips types, so there is no build step for the server) + MongoDB for
  storage. No framework — a small hand-rolled router over the web
  `Request`/`Response` pair.
- **Frontend:** React + Vite + TypeScript + Tailwind CSS, charts via [recharts](https://recharts.org/).
- Single user, no login. All data lives in one MongoDB database you control.

## Project layout

```
package.json          — the server; the client has its own in client/
tsconfig.json         — typecheck only, since Node runs the .ts files as-is
render.yaml           — Render blueprint
shared/
  types.ts             — types shared by client and server
  commitments.ts       — pure fixed-cost maths, shared so the server summary and
                         the client's yearly view cannot drift apart
server/
  main.ts              — entry point: connects to Mongo, serves the API and client
  router.ts            — route table
  handlers/            — settings / months / expenses / commitments / rates /
                         advisor endpoints
  lib/
    store.ts           — the storage interface the server is written against
    mongo-store.ts     — MongoDB implementation of it
    keys.ts            — key builders
    node-server.ts     — runs a fetch-style handler on node:http
    static.ts          — serves the built client, with SPA fallback
    env.ts             — config from the environment or .env
    aggregate.ts       — month-summary maths
    rates.ts           — exchange-rate fetch + cache
    snapshot.ts        — the advisor's view of your finances
    advisor-prompt.ts  — the advisor's system instruction
    gemini.ts          — Gemini client
    ulid.ts            — id generator
scripts/
  store.test.ts        — storage behaviour tests against a real mongod
  api.test.ts          — end-to-end API tests
  export-deno-kv.deno.ts — one-off migration export (needs Deno; see below)
  import-kv-export.ts  — one-off migration import
client/
  src/
    api.ts             — fetch wrapper for the backend
    hooks/             — useSettings, useSummary, useExpenses, useMonthRecord,
                         useMonthHistory, useCommitments, useYearCommitments,
                         useRates, useAdvisor
    lib/navigation.ts  — the two-route path switch (landing vs. tracker)
    lib/accumulation.ts — the month-on-month running total of what is left
    lib/money.ts       — the one place amounts are formatted and converted
    components/        — AppHeader, BottomNav, MonthFlow, CommitmentForm,
                         CommitmentsCard, AdvisorText, charts, ...
    components/landing/ — landing-page-only pieces
    views/             — Landing, Dashboard, Add, Expenses, Commitments, Advisor,
                         Settings
```

## Routes

There are two, switched on `location.pathname` in `client/src/lib/navigation.ts`
rather than with a router dependency:

| Path | What it renders |
|---|---|
| `/` | `LandingView` — the marketing page |
| `/app` | the tracker itself (month, add, spending, fixed costs, advice, setup) |

`server/lib/static.ts` falls back to `index.html` for any non-`/api/` path
that isn't a file on disk, so `/app` survives a hard refresh without extra
server config.

## Money advisor

A chat that answers questions about purchases, saving, investing, and lending or
borrowing, grounded in the user's own records.

**Setup.** The advisor needs `GEMINI_API_KEY`, read from the environment only.
There is deliberately no fallback key in the source: a committed secret can be
spent by anyone who can read the repo, and deleting it later does not remove it
from git history. Without a key the Advice tab still renders and explains that
it is switched off, every other feature works as normal, and nothing is ever
sent anywhere.

Either export it:

```sh
GEMINI_API_KEY=... npm run dev
```

...or copy `.env.example` to `.env` (gitignored) and put it there, which
`server/lib/env.ts` reads at startup:

```sh
cp .env.example .env    # then fill in GEMINI_API_KEY
npm run dev
```

A real environment variable wins over `.env`. `GEMINI_MODEL` overrides the model
(default `gemini-3.6-flash`), and both sources are checked for it too. The
server logs once at startup when no key is configured, so a switched-off advisor
is never a surprise.

**How it is grounded.** `server/lib/snapshot.ts` renders the user's real figures
as labelled plain text: this month's income, fixed costs, spendable budget and
free-to-spend; every commitment and the annual load; six months of history with
how often the budget was breached; and the category mix over three months. It is
rebuilt on *every* turn, so advice always reflects the figures as they are now
rather than as they were when the chat opened. The same string is served by
`GET /api/advisor/context` and shown in the UI behind "See what it can read
about you", so nothing is sent unseen.

**Ghanaian grounding.** `server/lib/advisor-prompt.ts` holds the system
instruction. It carries only *structural* knowledge: BoG, SEC, NIC, NPRA and the
GSE, and how to check a licence; Treasury bills as the local benchmark, and the
fact that the 2022-23 DDEP means Ghanaian government bonds are not risk-free;
susu, credit unions, MoMo, Tier 3 pensions, cedi depreciation; the rent-advance
norm, termly school fees and extended-family obligations; and that returns
promised above T-bill yields are the clearest warning sign, as Menzgold and DKM
showed.

**No invented figures.** Deliberately, no current rate, inflation number or levy
percentage appears in that prompt, and the model is told never to state one as
fact. Remembered values are stale by definition, and a confident stale number is
worse than none. Current figures come only from the benchmark rates the user
enters in Setup (`settings.marketContext`: 91-day T-bill, inflation, typical loan
APR), which the snapshot carries and the advisor does real arithmetic against.
Anything missing, it asks for, or points at a source.

Search grounding would remove that limitation, but the free Gemini tier has no
quota for it (every grounded call returns 429), so it is off. Set
`ADVISOR_SEARCH=1` on a paid key to enable it.

**Failure behaviour.** 429 and 503 are retried with backoff; 401, 403 and 404 are
reported as the configuration problems they are. When a turn fails the question
is still persisted, so the UI offers "Ask again" with the text intact instead of
losing it. Replies render through a small hand-rolled Markdown subset that builds
React elements rather than setting `innerHTML`, so model output cannot inject
markup.

**It is not advice.** The advisor gives general guidance, says so, and points at
a SEC-licensed adviser for anything large or tax-sensitive. The landing page
disclaimer and privacy copy were updated to match, since asking a question does
send a summary of the user's figures to Google's Gemini API.

## Currency

Two currencies, doing different jobs:

- `settings.currency` is the **base**: what every stored number actually means.
  Changing it relabels your history, it does not convert it.
- `settings.displayCurrency` is optional and **display-only**. When set, every
  amount on screen is converted at the latest rate. Nothing stored changes, and
  amount inputs stay in the base currency — they are labelled with it — so no
  saved record can ever be corrupted by a bad rate.

`client/src/lib/money.ts` is the single place this happens: it exposes a `Money`
object (`format`, `compact`, `convert`) that is threaded through the tracker in
place of a currency string. `formatCurrency` is not called anywhere else, so
there is no path by which one view can disagree with another.

Conversion is a linear rescale, so chart *data* stays in base units and only
the axis and tooltip labels convert — the geometry is identical either way.

Rates come from [open.er-api.com](https://open.er-api.com) (no API key), are
fetched server-side and cached in KV, and refresh after 12 hours. The same
current rate is applied to every month, past and present. If a refresh fails
the cached table keeps being used and is flagged as out of date in Setup; only
when nothing has ever been cached does the app fall back to showing base-currency
amounts. A failed fetch backs off for ten minutes and never overwrites a good
snapshot.

## Installed app (PWA)

`client/public/manifest.webmanifest` makes the app installable: `start_url` is
`/app`, so installing lands on the tracker rather than the marketing page, and
`display: standalone` drops the browser chrome. Android Chrome needs this file
to offer installation at all; iOS uses the `apple-touch-icon` link instead.

Icons are a violet rounded tile with a white W, matching the wordmark in
`AppHeader`. There are three: 192 and 512 for Android, a 512 `maskable` one
whose glyph sits inside the middle 80% so a circular or squircle mask cannot
clip it, and a 180 PNG for iOS.

### Device insets

`index.html` sets `viewport-fit=cover` and, on iOS,
`apple-mobile-web-app-status-bar-style=black-translucent`. Together those put
the page *under* the status bar and the home indicator, which is what allows the
header's own colour to fill the strip behind the clock and battery — but it also
means anything pinned to an edge has to pad itself back out, or its contents end
up beneath the system UI.

`client/src/index.css` exposes the four insets as `--safe-top`, `--safe-right`,
`--safe-bottom` and `--safe-left`, each with a `0px` fallback so they are inert
in a desktop browser, and four utilities built on them:

| Class | Used by | Purpose |
|---|---|---|
| `pane-top` | `AppHeader`, the landing header | pads the bar so its contents clear the status bar while its background still fills that strip |
| `pane-bottom` | `BottomNav` | keeps the tab row above the home indicator |
| `pb-nav` | every tracker view | scroll clearance for the fixed nav: its height, its inset, and some air |
| `px-safe` | tracker views and header rows | side gutters that survive a landscape notch; 1rem matches `px-4`, so it only ever adds room |

## Theme

Colours, fonts and planes are CSS custom properties set in
`client/src/index.css`, so the look is changed there rather than in components:

- `--brand` (`#6544e0`) is the accent for interactive chrome, the active nav
  item, primary buttons and the "spent" chart series. `--accent` aliases it.
- `--deep` (`#171233`) is the header and footer plane, and the page plane in
  dark mode. `--header-plane` is the translucent version used by the two
  sticky headers, so neither hard-codes an rgba string.
- `--tone-fixed` is the neutral used wherever fixed commitments appear as a
  money series, kept clear of `--brand` ("spent") and `--status-good` ("kept").
- `--font-display` (Sora) is applied to headings and figures;
  `--font-body` (Plus Jakarta Sans) to everything else. Both load from Google
  Fonts in `client/index.html`.
- `--series-1`…`--series-7` stay reserved for expense categories, mapped in
  `client/src/lib/categories.ts`.
- The `.ink` class turns any section into a deep indigo band by re-pointing the
  plane tokens at their `--ink-*` equivalents, which is how the landing page
  alternates dark and light sections without components knowing about it.

Controls are squared off (`rounded-lg`) rather than pill-shaped, and cards use
`rounded-xl`; section labels are an accent rule plus small caps rather than a
filled chip.

Both themes follow `prefers-color-scheme`, and `data-theme="light" | "dark"` on
`<html>` overrides it.

## Running it

Requires [Node.js](https://nodejs.org/) 24 or newer and a MongoDB database.

```sh
npm install
npm --prefix client install
cp .env.example .env      # then set MONGODB_URI
```

For a local database, either point `MONGODB_URI` at your Atlas cluster, or run
one in Docker:

```sh
docker run -d --name wadisenn-mongo -p 27017:27017 mongo:7
# MONGODB_URI=mongodb://127.0.0.1:27017/wadisenn
```

**Development** (client on :5173 proxying `/api` to the server on :8000):

```sh
npm run dev
```

**Production** (single process, one port):

```sh
npm run build    # builds client/dist
npm start        # serves the API and the built client on $PORT, default 8000
```

Other scripts: `npm run dev:server` / `npm run dev:client` run one side;
`npm run typecheck` runs `tsc --noEmit`.

### Tests

Both suites need a MongoDB to talk to and use their own databases, so they
never touch your real data:

```sh
docker run -d --name wadisenn-mongo -p 27019:27017 mongo:7
export MONGODB_TEST_URI="mongodb://127.0.0.1:27019/?directConnection=true"
node scripts/store.test.ts   # storage semantics: prefix scans, insert-if-absent
node scripts/api.test.ts     # end-to-end API behaviour
```

## Deploying (Render)

Render's native Node runtime runs this directly — no Docker needed. Either
point Render at `render.yaml`, or configure it by hand:

| Field | Value |
|---|---|
| Language | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/settings` |
| `NODE_VERSION` | `24` |
| `MONGODB_URI` | your Atlas connection string (secret) |
| `MONGODB_DB` | `wadisenn` |
| `GEMINI_API_KEY` | optional; advisor is off without it |

`PORT` is injected by Render and read by `server/main.ts`; the server binds
`0.0.0.0`, which Render requires. The client bundle is built at deploy time and
served by the same process, so there is no separate static site.

### MongoDB Atlas setup

1. Create a **free (M0)** cluster — free forever, 512 MB, which is far more
   than this app needs.
2. **Database Access** — add a database user with a generated password. This
   is *not* your Atlas account login; using the latter gives `bad auth`.
3. **Network Access** — Render's free plan has no static outbound IPs, so add
   `0.0.0.0/0`. Security then rests entirely on that password, so make it long
   and random.
4. Copy the connection string from **Connect > Drivers** into `MONGODB_URI`.

### Free-tier limitations worth knowing

- The service **spins down after 15 minutes idle** and takes about a minute to
  wake, so the first request after a quiet spell is slow.
- Free instances **cannot** use persistent disks, which is exactly why storage
  lives in Atlas rather than on the filesystem.
- Atlas M0 **pauses after 30 days** with no connections, and has no automated
  backups — take a `mongodump` occasionally if the data matters.

### Migrating from the old Deno KV database

Earlier versions stored data in a local Deno KV file (`data/wadisenn.db`). To
carry that into MongoDB, run the export once with Deno still installed, then
import it with Node:

```sh
deno run --unstable-kv --allow-read --allow-write scripts/export-deno-kv.deno.ts
MONGODB_URI="mongodb+srv://..." node scripts/import-kv-export.ts
```

The import skips keys that already exist unless you pass `--overwrite`, so
re-running it is safe. Both `data/` and `kv-export.json` are gitignored because
they hold real financial data. Once migrated, `scripts/export-deno-kv.deno.ts`
is the only file that needs Deno and can be deleted.

## Data model (MongoDB)

One collection, `kv`, holding one document per record:

| Field | Meaning |
|---|---|
| `_id` | the key's segments joined with a NUL byte |
| `key` | the original segments, e.g. `["expenses", "2026-03", "<ulid>"]` |
| `value` | the record itself |
| `updatedAt` | last write time |

The keys are:

- `["settings"]` — default monthly salary, base and display currency, and the
  benchmark rates the advisor reasons from
- `["months", "YYYY-MM"]` — that month's salary override (if any) + add-ons
- `["expenses", "YYYY-MM", "<ulid>"]` — one expense entry
- `["commitments", "<ulid>"]` — one fixed cost: amount, `monthly` or `yearly`
  cadence, category, `startMonth` and optional `endMonth`, plus `dueDay`
  (monthly) or `dueMonth` + `spread` (yearly)
- `["rates", "<BASE>"]` — cached exchange-rate table for that base currency
- `["advisor", "thread"]` — the advisor conversation, last 40 turns

### Why a key/value shape on top of documents

The server is written against `server/lib/store.ts`: five operations over
ordered hierarchical string keys. That shape came from Deno KV, which this
project used before moving to MongoDB, and keeping it meant the handlers and
all the month-summary maths did not have to change — only the storage layer
did.

Joining the key with NUL is what makes it work. NUL sorts below every character
a segment can contain, so the range `[prefix + "\0", prefix + "\1")` is
exactly the set of descendants of that prefix. A prefix scan is therefore an
ordered `_id` index range, needing no secondary index, and `["expenses"]`
cannot accidentally match `["expenses2"]`. `insertIfAbsent` is a plain
`insertOne` relying on the unique `_id` index, which is what makes a ULID
collision impossible rather than merely unlikely.

Commitments are stored once and never per month. Which months they touch is
derived from the start/end window and the cadence on read, so editing a cost
today does not rewrite what past months looked like — and end-dating the old
rent leaves last year's numbers intact.

All dashboard numbers (income, fixed commitments, spendable budget, spent,
remaining, projected end-of-month, cumulative daily spend, month-over-month
history) are computed on read from these records — see
`server/lib/aggregate.ts` and `shared/commitments.ts`.

The month-on-month running total of what is left is derived on the client from
those summaries, in `client/src/lib/accumulation.ts`. It sums the whole history
before windowing to the last twelve months, so the line shows the true all-time
position instead of restarting from zero at the left edge of the chart.

## API

| Method | Path | Purpose |
|---|---|---|
| GET / PUT | `/api/settings` | default salary + currency |
| GET | `/api/months` | every month that has data, summarised |
| GET / PUT | `/api/months/:month` | salary override + add-ons |
| GET | `/api/months/:month/summary` | the full month summary |
| POST | `/api/months/:month/addons` | add one-off income |
| DELETE | `/api/months/:month/addons/:id` | remove one-off income |
| GET / POST | `/api/months/:month/expenses` | list / log spending |
| PUT / DELETE | `/api/months/:month/expenses/:id` | edit / delete a spend |
| GET / POST | `/api/commitments` | list / create a fixed cost |
| PUT / DELETE | `/api/commitments/:id` | edit / delete a fixed cost |
| GET | `/api/commitments/year/:year` | the twelve-month commitment load |
| GET | `/api/rates` | cached rate table for the base currency |
| POST | `/api/rates/refresh` | force a rate refresh, ignoring the cache window |
| GET | `/api/advisor` | the chat thread, plus whether the advisor is configured |
| GET | `/api/advisor/context` | the exact snapshot the advisor is sent |
| POST | `/api/advisor/messages` | ask a question, get the next turn |
| DELETE | `/api/advisor` | clear the thread |
