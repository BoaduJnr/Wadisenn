export interface Settings {
  defaultMonthlySalary: number;
  currency: string;
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

export interface MonthSummary {
  month: string;
  income: {
    base: number;
    addOns: AddOn[];
    total: number;
  };
  totalSpent: number;
  remaining: number;
  dailyCumulative: { day: number; cumulativeSpent: number }[];
  isCurrentMonth: boolean;
  projectedTotalSpend: number | null;
  projectedRemaining: number | null;
  daysInMonth: number;
  today: number | null;
}
