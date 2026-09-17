import type { StoreKey } from "./store.ts";

export function settingsKey(): StoreKey {
  return ["settings"];
}

export function monthKey(month: string): StoreKey {
  return ["months", month];
}

export function monthsPrefix(): StoreKey {
  return ["months"];
}

export function expenseKey(month: string, id: string): StoreKey {
  return ["expenses", month, id];
}

export function expensesPrefix(month: string): StoreKey {
  return ["expenses", month];
}

export function commitmentKey(id: string): StoreKey {
  return ["commitments", id];
}

export function commitmentsPrefix(): StoreKey {
  return ["commitments"];
}

export function ratesKey(base: string): StoreKey {
  return ["rates", base];
}

/** Single-user app, so the advisor has exactly one conversation. */
export function advisorThreadKey(): StoreKey {
  return ["advisor", "thread"];
}
