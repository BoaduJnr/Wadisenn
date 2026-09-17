/**
 * One-off: loads a kv-export.json produced by export-deno-kv.deno.ts into
 * MongoDB.
 *
 *   MONGODB_URI="mongodb+srv://..." node scripts/import-kv-export.ts
 *   MONGODB_URI="..." node scripts/import-kv-export.ts ./kv-export.json --overwrite
 *
 * Existing keys are skipped unless --overwrite is passed, so re-running it is
 * safe and cannot clobber data you have since entered by hand.
 */
import { readFileSync } from "node:fs";
import { MongoStore } from "../server/lib/mongo-store.ts";
import { readEnv } from "../server/lib/env.ts";

const file = process.argv[2]?.startsWith("--") ? "./kv-export.json" : process.argv[2] ?? "./kv-export.json";
const overwrite = process.argv.includes("--overwrite");

const uri = readEnv("MONGODB_URI");
if (!uri) {
  console.error("MONGODB_URI is not set (environment or .env).");
  process.exit(1);
}

const parsed = JSON.parse(readFileSync(file, "utf8")) as {
  entries: { key: unknown[]; value: unknown }[];
};
if (!Array.isArray(parsed.entries)) {
  console.error(`${file} does not look like a kv export: no "entries" array.`);
  process.exit(1);
}

const store = await MongoStore.connect(uri, readEnv("MONGODB_DB"));

let written = 0;
let skipped = 0;
for (const entry of parsed.entries) {
  // Keys must be all-string to encode; anything else was never written by this
  // app and is safer reported than silently coerced.
  if (!entry.key.every((s) => typeof s === "string")) {
    console.warn("  skipped non-string key:", JSON.stringify(entry.key));
    skipped++;
    continue;
  }
  const key = entry.key as string[];

  if (!overwrite && (await store.get(key)).value !== null) {
    console.log("  exists, skipped:", JSON.stringify(key));
    skipped++;
    continue;
  }
  await store.set(key, entry.value);
  console.log("  imported:", JSON.stringify(key));
  written++;
}

await store.close();
console.log(`\ndone: ${written} written, ${skipped} skipped`);
