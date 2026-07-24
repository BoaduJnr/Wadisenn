export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const MONTH_LABEL_SHORT_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short" });

export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(year, m - 1, 1));
}

export function monthLabelShort(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return MONTH_LABEL_SHORT_FORMATTER.format(new Date(year, m - 1, 1));
}

export function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function dayLabel(dateStr: string): string {
  const [year, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(year, m - 1, d),
  );
}
