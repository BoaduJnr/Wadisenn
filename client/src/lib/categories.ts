import { EXPENSE_CATEGORIES } from "../types";

export const CATEGORY_COLOR_VAR: Record<string, string> = {
  Food: "var(--series-1)",
  Transport: "var(--series-2)",
  Bills: "var(--series-3)",
  Shopping: "var(--series-4)",
  Health: "var(--series-5)",
  Entertainment: "var(--series-6)",
  Other: "var(--series-7)",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLOR_VAR[category] ?? "var(--series-7)";
}

export { EXPENSE_CATEGORIES };
