import type { AddOn, Expense, MonthRecord, MonthSummary, Settings } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request to ${path} failed with ${res.status}`);
  }
  return res.json();
}

export const getSettings = () => request<Settings>("/settings");

export const saveSettings = (settings: Settings) =>
  request<Settings>("/settings", { method: "PUT", body: JSON.stringify(settings) });

export const getMonthRecord = (month: string) => request<MonthRecord>(`/months/${month}`);

export const saveMonthRecord = (month: string, record: { salaryOverride?: number | null; addOns: AddOn[] }) =>
  request<MonthRecord>(`/months/${month}`, { method: "PUT", body: JSON.stringify(record) });

export const addAddOn = (month: string, addOn: { label: string; amount: number }) =>
  request<AddOn>(`/months/${month}/addons`, { method: "POST", body: JSON.stringify(addOn) });

export const deleteAddOn = (month: string, id: string) =>
  request<{ ok: true }>(`/months/${month}/addons/${id}`, { method: "DELETE" });

export const getMonthSummary = (month: string) => request<MonthSummary>(`/months/${month}/summary`);

export const listMonthSummaries = () => request<MonthSummary[]>("/months");

export const listExpenses = (month: string) => request<Expense[]>(`/months/${month}/expenses`);

export const createExpense = (
  month: string,
  expense: { date: string; amount: number; category: string; note?: string },
) => request<Expense>(`/months/${month}/expenses`, { method: "POST", body: JSON.stringify(expense) });

export const updateExpense = (
  month: string,
  id: string,
  expense: Partial<{ date: string; amount: number; category: string; note?: string }>,
) => request<Expense>(`/months/${month}/expenses/${id}`, { method: "PUT", body: JSON.stringify(expense) });

export const deleteExpense = (month: string, id: string) =>
  request<{ ok: true }>(`/months/${month}/expenses/${id}`, { method: "DELETE" });
