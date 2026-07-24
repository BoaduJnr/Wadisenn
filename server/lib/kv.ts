let kvInstance: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) {
    kvInstance = await Deno.openKv("./data/wadisenn.db");
  }
  return kvInstance;
}

export function settingsKey(): Deno.KvKey {
  return ["settings"];
}

export function monthKey(month: string): Deno.KvKey {
  return ["months", month];
}

export function monthsPrefix(): Deno.KvKey {
  return ["months"];
}

export function expenseKey(month: string, id: string): Deno.KvKey {
  return ["expenses", month, id];
}

export function expensesPrefix(month: string): Deno.KvKey {
  return ["expenses", month];
}
