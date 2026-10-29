import type { BudgetPace } from "./pace.ts";

export interface Settings {
  defaultMonthlySalary: number;
  /**
   * The currency the stored amounts are actually denominated in. Every number
   * in KV means this currency; changing it relabels history, it does not
   * convert it.
   */
  currency: string;
  /**
   * What to convert to for display. Absent, empty, or equal to `currency`
   * means amounts are shown as stored. Conversion never touches what is saved.
   */
  displayCurrency?: string;
  /** Benchmark rates the user has entered, for the advisor to reason against. */
  marketContext?: MarketContext;
  /**
   * A spending ceiling assumed for every month, in the same way
   * `defaultMonthlySalary` is. A month may override it with its own
   * `targetBudget`; absent here too, the whole spendable budget is the ceiling.
   */
  defaultTargetBudget?: number;
}

/**
 * Current Ghanaian benchmark figures, supplied by the user.
 *
 * These move constantly — T-bill yields reset at weekly auctions — and the
 * advisor has no live data source, so it is told to reason only from what is
 * recorded here and to ask for anything missing rather than guess.
 */
export interface MarketContext {
  /** 91-day Treasury bill rate, annual percent. */
  tbillRate?: number;
  /** Year-on-year inflation, percent. */
  inflation?: number;
  /** Typical APR quoted for a bank personal loan, percent. */
  loanApr?: number;
  /** When the user last updated these, ISO date. */
  updatedAt?: string;
}

export interface AddOn {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
}

export interface MonthRecord {
  month: string;
  salaryOverride?: number;
  addOns: AddOn[];
  /**
   * This month's own spending ceiling, overriding `defaultTargetBudget` the
   * way `salaryOverride` overrides the default salary. Absent falls back to
   * the default, then to the whole spendable budget.
   */
  targetBudget?: number;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  month: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
  createdAt: string;
}

/** How often a fixed commitment comes out. */
export type Cadence = "monthly" | "yearly";

/**
 * A standing cost that is taken out of income before any day-to-day spending
 * is counted — rent, utilities, a subscription, an annual insurance premium.
 * Unlike an Expense it is never logged by hand; it recurs from its own rule.
 */
export interface Commitment {
  id: string;
  label: string;
  /** Per occurrence: the monthly amount, or the whole yearly amount. */
  amount: number;
  cadence: Cadence;
  category: string;
  /** Monthly only, 1–31. Informational — which day of the month it leaves. */
  dueDay?: number;
  /** Yearly only, 1–12. The month the whole amount lands in. */
  dueMonth?: number;
  /** Yearly only. Reserve amount/12 every month instead of charging dueMonth. */
  spread?: boolean;
  /** First month this applies, "YYYY-MM". */
  startMonth: string;
  /** Last month this applies, inclusive, "YYYY-MM". Open-ended when absent. */
  endMonth?: string;
  createdAt: string;
}

/** One commitment as it lands on a single month. */
export interface CommitmentCharge {
  id: string;
  label: string;
  /** What this commitment takes out of the month being summarised. */
  amount: number;
  cadence: Cadence;
  category: string;
  dueDay?: number;
  dueMonth?: number;
  /** True when this is a yearly cost being reserved a twelfth at a time. */
  reserved: boolean;
}

export interface MonthCommitments {
  charges: CommitmentCharge[];
  /** From monthly-cadence commitments. */
  monthlyTotal: number;
  /** From yearly-cadence commitments — a full charge, or a twelfth reserved. */
  yearlyTotal: number;
  total: number;
}

export interface MonthSummary {
  month: string;
  income: {
    base: number;
    addOns: AddOn[];
    total: number;
  };
  commitments: MonthCommitments;
  /** income.total − commitments.total: the discretionary budget for the month. */
  budget: number;
  totalSpent: number;
  /** budget − totalSpent: what is actually still free. */
  remaining: number;
  dailyCumulative: { day: number; cumulativeSpent: number }[];
  isCurrentMonth: boolean;
  projectedTotalSpend: number | null;
  projectedRemaining: number | null;
  daysInMonth: number;
  today: number | null;
  /** Spending against the target, measured against how much month has gone. */
  pace: BudgetPace;
}

/** Commitment load across one calendar year. */
export interface YearCommitments {
  year: number;
  /** Twelve entries, "YYYY-MM" → what commitments take out of that month. */
  byMonth: { month: string; total: number }[];
  monthlyTotal: number;
  yearlyTotal: number;
  total: number;
  /** total / 12 — what the whole commitment load averages per month. */
  monthlyAverage: number;
}

/** One payment back against a loan. */
export interface LoanRepayment {
  id: string;
  amount: number;
  /** "YYYY-MM-DD" the money came back. */
  date: string;
  note?: string;
  createdAt: string;
}

/**
 * Money the user has lent to someone. It is tracked on its own and never
 * touches the month budget: lending is not spending, and a repayment is not
 * income, so counting either would make "left to spend" dishonest.
 *
 * What is still owed is derived from the repayments rather than stored, so the
 * two can never disagree.
 */
export interface Loan {
  id: string;
  /** Who has the money. Loans group by this, ignoring case and spacing. */
  person: string;
  amount: number;
  /** "YYYY-MM-DD" the money went out. */
  date: string;
  /** "YYYY-MM-DD" it was promised back by, if a date was agreed. */
  dueDate?: string;
  note?: string;
  repayments: LoanRepayment[];
  createdAt: string;
}

/** A cached table of base -> target multipliers, as stored in KV. */
export interface RateSnapshot {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
  provider: string;
}

export interface RatesResponse {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string | null;
  /** These rates are older than the refresh window but still the best we have. */
  stale: boolean;
  /** No rates have ever been obtained for this base currency. */
  available: boolean;
}

export type AdvisorRole = "user" | "advisor";

/** The advisor's tools that change the user's records. */
export type AdvisorActionTool = "add_expense" | "add_income" | "add_loan" | "record_loan_repayment";

export type AdvisorActionStatus = "pending" | "applied" | "dismissed" | "failed";

/**
 * A change the advisor wants to make to the user's records.
 *
 * The advisor never writes anything itself. It proposes, the user sees the
 * proposal in the chat, and only their confirmation applies it — through the
 * same API, and so the same validation, as the app's own forms.
 */
export interface AdvisorAction {
  id: string;
  tool: AdvisorActionTool;
  /** Arguments as validated when proposed, replayed exactly on confirm. */
  args: Record<string, unknown>;
  /** Plain-language description built by the server, never by the model. */
  summary: string;
  status: AdvisorActionStatus;
  /** Why applying it failed, when status is "failed". */
  error?: string;
  resolvedAt?: string;
}

export interface AdvisorMessage {
  id: string;
  role: AdvisorRole;
  text: string;
  createdAt: string;
  /** Set when the turn failed, so the UI can offer a retry instead of a reply. */
  error?: string;
  /** Advisor turns only: what it looked up to answer, e.g. "Spending in 2026-10". */
  lookups?: string[];
  /** Advisor turns only: changes it proposed, awaiting or past confirmation. */
  actions?: AdvisorAction[];
}

export interface AdvisorThread {
  messages: AdvisorMessage[];
  updatedAt: string | null;
  /** False when the server has no NVIDIA_API_KEY, so the UI can explain why. */
  enabled: boolean;
}
