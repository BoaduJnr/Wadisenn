/**
 * Server configuration, read from the environment only.
 *
 * Two sources, in order:
 *
 *   1. a real environment variable
 *   2. a matching line in a `.env` file at the repo root
 *
 * There are deliberately no fallback values for secrets here. Anything
 * committed to the repo can be used by anyone who can read the code, and
 * removing it later does not remove it from git history. `.env` is gitignored,
 * so it gives the same convenience without that.
 */

import { readFileSync } from "node:fs";

let dotEnvCache: Record<string, string> | null = null;

/**
 * Minimal `.env` reader — enough for KEY=value lines, with optional quotes and
 * `#` comments. Hand-rolled to avoid a dependency for one small optional file;
 * read once and cached, since configuration never changes mid-process.
 */
function readDotEnv(): Record<string, string> {
  if (dotEnvCache) return dotEnvCache;
  dotEnvCache = {};

  let text: string;
  try {
    text = readFileSync(".env", "utf8");
  } catch {
    // No .env, or no permission to read it. Both are normal.
    return dotEnvCache;
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    if (key) dotEnvCache[key] = value;
  }
  return dotEnvCache;
}

/** A setting from the environment, or a `.env` line, or undefined. */
export function readEnv(name: string): string | undefined {
  return process.env[name]?.trim() || readDotEnv()[name]?.trim() || undefined;
}

export function geminiApiKey(): string | undefined {
  return readEnv("GEMINI_API_KEY");
}

/** Says once at startup whether the advisor will work, so it is not a surprise. */
export function reportAdvisorConfig(): void {
  if (geminiApiKey()) return;
  console.log(
    "advisor: no GEMINI_API_KEY set, so the Advice tab will show as switched off. " +
      "Set the variable, or add it to a .env file in the project root, to enable it. " +
      "Everything else works without one.",
  );
}
