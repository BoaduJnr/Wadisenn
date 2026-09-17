/**
 * One-off: exports the old Deno KV database to JSON so it can be loaded into
 * MongoDB. This is the only file left that needs Deno, and only until you have
 * migrated — after that, delete it.
 *
 *   deno run --unstable-kv --allow-read --allow-write scripts/export-deno-kv.deno.ts
 *
 * Writes kv-export.json next to the repo root.
 */
const DB_PATH = Deno.args[0] ?? "./data/wadisenn.db";
const OUT = Deno.args[1] ?? "./kv-export.json";

const kv = await Deno.openKv(DB_PATH);
const entries: { key: unknown[]; value: unknown }[] = [];

for await (const entry of kv.list({ prefix: [] })) {
  entries.push({ key: [...entry.key], value: entry.value });
}
kv.close();

await Deno.writeTextFile(OUT, JSON.stringify({ entries }, null, 2));
console.log(`exported ${entries.length} entries from ${DB_PATH} to ${OUT}`);
for (const e of entries) console.log("  ", JSON.stringify(e.key));
