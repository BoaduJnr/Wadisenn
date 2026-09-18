import type {
  AddOn,
  AdvisorMessage,
  AdvisorThread,
  Commitment,
  Expense,
  MonthRecord,
  MonthSummary,
  RatesResponse,
  Settings,
  YearCommitments,
} from "./types";

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

export const saveSettings = (
  /** Omitted fields keep their stored value; an explicit null clears one. */
  // The nullable fields are omitted from the Partial and re-declared, or the
  // intersection would narrow `number | null` back down to `number`.
  settings: Partial<Omit<Settings, "displayCurrency" | "marketContext" | "defaultTargetBudget">> & {
    displayCurrency?: string | null;
    marketContext?: Settings["marketContext"] | null;
    defaultTargetBudget?: number | null;
  },
) =>
  request<Settings>("/settings", { method: "PUT", body: JSON.stringify(settings) });

export interface AdvisorThreadResponse extends AdvisorThread {
  starters: string[];
  model: string;
}

export const getAdvisorThread = () => request<AdvisorThreadResponse>("/advisor");

/** The exact snapshot sent to the model, so the UI can show it. */
export const getAdvisorContext = () => request<{ snapshot: string }>("/advisor/context");

export const sendAdvisorMessage = (text: string) =>
  request<{ question: AdvisorMessage; reply: AdvisorMessage }>("/advisor/messages", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const clearAdvisorThread = () => request<{ ok: true }>("/advisor", { method: "DELETE" });

export const getRates = () => request<RatesResponse>("/rates");

export const refreshRates = () => request<RatesResponse>("/rates/refresh", { method: "POST" });

export const getMonthRecord = (month: string) => request<MonthRecord>(`/months/${month}`);

export const saveMonthRecord = (
  month: string,
  /** Omitted fields keep their stored value; an explicit null clears one. */
  record: { salaryOverride?: number | null; addOns?: AddOn[]; targetBudget?: number | null },
) =>
  request<MonthRecord>(`/months/${month}`, { method: "PUT", body: JSON.stringify(record) });

export const addAddOn = (month: string, addOn: { label: string; amount: number }) =>
  request<AddOn>(`/months/${month}/addons`, { method: "POST", body: JSON.stringify(addOn) });

export const deleteAddOn = (month: string, id: string) =>
  request<{ ok: true }>(`/months/${month}/addons/${id}`, { method: "DELETE" });

export const listCommitments = () => request<Commitment[]>("/commitments");

export type CommitmentInput = Omit<Commitment, "id" | "createdAt">;

export const createCommitment = (commitment: CommitmentInput) =>
  request<Commitment>("/commitments", { method: "POST", body: JSON.stringify(commitment) });

export const updateCommitment = (id: string, commitment: Partial<CommitmentInput>) =>
  request<Commitment>(`/commitments/${id}`, { method: "PUT", body: JSON.stringify(commitment) });

export const deleteCommitment = (id: string) =>
  request<{ ok: true }>(`/commitments/${id}`, { method: "DELETE" });

export const getYearCommitments = (year: number) => request<YearCommitments>(`/commitments/year/${year}`);

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
