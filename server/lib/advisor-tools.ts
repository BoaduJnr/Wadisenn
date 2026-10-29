import type { AdvisorAction, AdvisorActionTool, Loan } from "../../shared/types.ts";
import { EXPENSE_CATEGORIES } from "../../shared/types.ts";
import { round2 } from "../../shared/commitments.ts";
import { loanBalance, personKey } from "../../shared/loans.ts";
import { createExpenseHandler } from "../handlers/expenses.ts";
import { createLoanHandler, createRepaymentHandler } from "../handlers/loans.ts";
import { postAddOnHandler } from "../handlers/months.ts";
import {
  computeMonthSummary,
  getSettings,
  listCommitments,
  listExpenses,
  listLoans,
  todayDateString,
} from "./aggregate.ts";
import { isValidDate, isValidMonth } from "./http.ts";
import { loanKey } from "./keys.ts";
import type { ToolDefinition } from "./nvidia.ts";
import type { Store } from "./store.ts";

/**
 * The advisor's tools.
 *
 * Two kinds, treated very differently:
 *
 * - Lookups only read, so they run as soon as the model asks. They let it pull
 *   detail the snapshot leaves out, such as a past month's individual expenses.
 *
 * - Actions change the user's records, so the model can only *propose* them.
 *   Each proposal is checked here, described in words the server writes, and
 *   held until the user confirms it in the chat. Applying it then goes through
 *   the same handler as the app's own form, so the advisor can never write
 *   anything the UI could not.
 */

const MONTH = { type: "string", description: "Calendar month, YYYY-MM." };
const DATE = { type: "string", description: "Calendar date, YYYY-MM-DD. Defaults to today." };
const AMOUNT = { type: "number", description: "Amount in the user's base currency, greater than 0." };

function fn(name: string, description: string, properties: Record<string, unknown>, required: string[] = []) {
  return {
    type: "function" as const,
    function: { name, description, parameters: { type: "object", properties, required } },
  };
}

export const ADVISOR_TOOLS: ToolDefinition[] = [
  fn(
    "get_month_summary",
    "Income, fixed costs, budget, spending, pace and what is left for one month. Use for any month other " +
      "than the current one, which is already in your context.",
    { month: MONTH },
    ["month"],
  ),
  fn(
    "list_expenses",
    "Every expense logged in one month, optionally only one category.",
    { month: MONTH, category: { type: "string", enum: [...EXPENSE_CATEGORIES] } },
    ["month"],
  ),
  fn(
    "list_loans",
    "Money the user has lent out, with each loan's id, what is still owed and any due date.",
    { status: { type: "string", enum: ["outstanding", "settled", "all"], description: "Defaults to outstanding." } },
  ),
  fn("list_commitments", "The user's fixed costs: rent, bills, subscriptions, yearly renewals.", {}),

  fn(
    "add_expense",
    "PROPOSE logging an expense. The user must confirm before it is saved.",
    {
      amount: AMOUNT,
      category: { type: "string", enum: [...EXPENSE_CATEGORIES] },
      date: DATE,
      note: { type: "string", description: "Short description, e.g. 'Lunch at work'." },
    },
    ["amount", "category"],
  ),
  fn(
    "add_income",
    "PROPOSE adding one-off income (a bonus, side job, gift) to a month. The user must confirm.",
    { amount: AMOUNT, label: { type: "string", description: "What the money was, e.g. 'Freelance job'." }, month: MONTH },
    ["amount", "label"],
  ),
  fn(
    "add_loan",
    "PROPOSE recording money the user lent to someone. The user must confirm.",
    {
      person: { type: "string", description: "Who borrowed it." },
      amount: AMOUNT,
      date: DATE,
      dueDate: { type: "string", description: "Agreed pay-back date, YYYY-MM-DD, if any." },
      note: { type: "string" },
    },
    ["person", "amount"],
  ),
  fn(
    "record_loan_repayment",
    "PROPOSE recording money paid back on a loan. Give loanId from list_loans, or the person's name if they " +
      "have only one outstanding loan. The user must confirm.",
    {
      loanId: { type: "string" },
      person: { type: "string" },
      amount: AMOUNT,
      date: DATE,
    },
    ["amount"],
  ),
];

const ACTION_TOOLS = new Set<string>(["add_expense", "add_income", "add_loan", "record_loan_repayment"]);

export function isActionTool(name: string): name is AdvisorActionTool {
  return ACTION_TOOLS.has(name);
}

type Args = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

/** Same shape as the app's own currency display, without depending on the client. */
function formatAmount(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("en-GH", { maximumFractionDigits: 2 }).format(amount)}`;
}

/** Drops the per-day series, which is long and adds nothing the model can use. */
function compactSummary(summary: Awaited<ReturnType<typeof computeMonthSummary>>) {
  const { dailyCumulative: _daily, ...rest } = summary;
  return rest;
}

/**
 * Runs a lookup. Returns what to hand back to the model, plus a short label the
 * chat shows so the user can see what was read to reach the answer.
 */
export async function runLookup(name: string, args: Args, kv: Store): Promise<{ label: string; result: unknown }> {
  switch (name) {
    case "get_month_summary": {
      const month = str(args.month);
      if (!isValidMonth(month)) return { label: "Month summary", result: { error: "month must be YYYY-MM" } };
      return { label: `Summary of ${month}`, result: compactSummary(await computeMonthSummary(kv, month)) };
    }
    case "list_expenses": {
      const month = str(args.month);
      if (!isValidMonth(month)) return { label: "Expenses", result: { error: "month must be YYYY-MM" } };
      const category = str(args.category);
      const expenses = (await listExpenses(kv, month))
        .filter((e) => !category || e.category === category)
        .map(({ date, amount, category, note }) => ({ date, amount, category, note }));
      const total = round2(expenses.reduce((sum, e) => sum + e.amount, 0));
      return { label: `${category || "All"} expenses in ${month}`, result: { month, count: expenses.length, total, expenses } };
    }
    case "list_loans": {
      const status = str(args.status) || "outstanding";
      const today = todayDateString();
      const loans = (await listLoans(kv))
        .map((loan) => ({ loan, balance: loanBalance(loan, today) }))
        .filter(({ balance }) => status === "all" || (status === "settled") === balance.settled)
        .map(({ loan, balance }) => ({
          loanId: loan.id,
          person: loan.person,
          lent: loan.amount,
          lentOn: loan.date,
          dueDate: loan.dueDate,
          repaid: balance.repaid,
          outstanding: balance.outstanding,
          overdue: balance.overdue,
          note: loan.note,
        }));
      return { label: "Your loans", result: { status, loans } };
    }
    case "list_commitments":
      return { label: "Your fixed costs", result: await listCommitments(kv) };
    default:
      return { label: name, result: { error: `unknown tool ${name}` } };
  }
}

/**
 * Checks a proposed action and turns it into something the user can confirm.
 *
 * Anything wrong goes back to the model as an error so it can correct itself
 * or ask, instead of putting a broken proposal in front of the user. Final
 * validation still happens on confirm, in the real handler.
 */
export async function prepareAction(
  tool: AdvisorActionTool,
  args: Args,
  kv: Store,
): Promise<{ args: Args; summary: string } | { error: string }> {
  const { currency } = await getSettings(kv);
  const money = (amount: number) => formatAmount(amount, currency);
  const today = todayDateString();

  if (!isAmount(args.amount)) return { error: "amount must be a number greater than 0" };
  const amount = round2(args.amount);

  const date = str(args.date) || today;
  if ((tool !== "add_income") && !isValidDate(date)) return { error: "date must be YYYY-MM-DD" };

  switch (tool) {
    case "add_expense": {
      const category = str(args.category);
      if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
        return { error: `category must be one of ${EXPENSE_CATEGORIES.join(", ")}` };
      }
      const note = str(args.note) || undefined;
      return {
        args: { amount, category, date, note },
        summary: `Log ${money(amount)} of ${category} spending on ${date}${note ? ` — ${note}` : ""}`,
      };
    }

    case "add_income": {
      const label = str(args.label);
      if (!label) return { error: "label is required, e.g. 'Bonus'" };
      const month = str(args.month) || today.slice(0, 7);
      if (!isValidMonth(month)) return { error: "month must be YYYY-MM" };
      return { args: { amount, label, month }, summary: `Add ${money(amount)} of extra income to ${month}: ${label}` };
    }

    case "add_loan": {
      const person = str(args.person).replace(/\s+/g, " ");
      if (!person) return { error: "person is required" };
      const dueDate = str(args.dueDate) || undefined;
      if (dueDate && (!isValidDate(dueDate) || dueDate < date)) {
        return { error: "dueDate must be YYYY-MM-DD and not before the loan date" };
      }
      const note = str(args.note) || undefined;
      return {
        args: { person, amount, date, dueDate, note },
        summary: `Record lending ${money(amount)} to ${person} on ${date}${dueDate ? `, due back ${dueDate}` : ""}`,
      };
    }

    case "record_loan_repayment": {
      const loan = await findLoan(kv, str(args.loanId), str(args.person), today);
      if ("error" in loan) return loan;
      const { outstanding } = loanBalance(loan, today);
      if (amount > outstanding) {
        return { error: `${loan.person} only owes ${outstanding} on that loan` };
      }
      const left = round2(outstanding - amount);
      return {
        args: { loanId: loan.id, amount, date },
        summary: `Record ${money(amount)} paid back by ${loan.person} on ${date} (${
          left === 0 ? "clears the loan" : `${money(left)} still owed`
        })`,
      };
    }
  }
}

/** The loan a repayment is for: by id, or the one outstanding loan a person has. */
async function findLoan(kv: Store, loanId: string, person: string, today: string): Promise<Loan | { error: string }> {
  if (loanId) {
    const loan = (await kv.get<Loan>(loanKey(loanId))).value;
    return loan ?? { error: `no loan with id ${loanId}; call list_loans for the right id` };
  }
  if (!person) return { error: "give loanId, or the person's name" };

  const owing = (await listLoans(kv)).filter(
    (l) => personKey(l.person) === personKey(person) && !loanBalance(l, today).settled,
  );
  if (owing.length === 1) return owing[0];
  if (owing.length === 0) return { error: `no outstanding loan to ${person}; call list_loans to check the name` };
  return {
    error: `${person} has ${owing.length} outstanding loans (${
      owing.map((l) => `${l.id}: ${l.amount} lent ${l.date}`).join("; ")
    }). Ask the user which one, then pass its loanId.`,
  };
}

function request(body: unknown): Request {
  return new Request("http://advisor.local/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Applies a confirmed action through the app's own handler. */
export async function applyAction(action: AdvisorAction, kv: Store): Promise<{ ok: true } | { error: string }> {
  const a = action.args as Record<string, string & number>;
  let res: Response;

  switch (action.tool) {
    case "add_expense":
      res = await createExpenseHandler(
        request({ date: a.date, amount: a.amount, category: a.category, note: a.note }),
        kv,
        { month: String(a.date).slice(0, 7) },
      );
      break;
    case "add_income":
      res = await postAddOnHandler(request({ label: a.label, amount: a.amount }), kv, { month: a.month });
      break;
    case "add_loan":
      res = await createLoanHandler(
        request({ person: a.person, amount: a.amount, date: a.date, dueDate: a.dueDate, note: a.note }),
        kv,
      );
      break;
    case "record_loan_repayment":
      res = await createRepaymentHandler(request({ amount: a.amount, date: a.date }), kv, { id: a.loanId });
      break;
  }

  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { error: body.error ?? `failed with ${res.status}` };
}
