import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readEnv, reportAdvisorConfig } from "./lib/env.ts";
import { MongoStore } from "./lib/mongo-store.ts";
import { serve } from "./lib/node-server.ts";
import { serveStatic } from "./lib/static.ts";
import { handleApiRequest } from "./router.ts";

/**
 * Resolved from this file rather than the working directory, so the built
 * client is found whether the server is started from the repo root or by a
 * platform that picks its own cwd.
 */
const here = dirname(fileURLToPath(import.meta.url));
const clientDist = resolve(here, "..", "client", "dist");

// Render injects PORT and requires binding 0.0.0.0, which is node-server.ts's
// default. Falls back to 8000 for local development.
const port = Number(readEnv("PORT") ?? 8000);

const mongoUri = readEnv("MONGODB_URI");
if (!mongoUri) {
  console.error(
    [
      "",
      "MONGODB_URI is not set.",
      "",
      "Put your MongoDB connection string in the environment, or in a .env",
      "file at the project root:",
      "",
      "  MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/",
      "",
      "See .env.example for every setting.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

/**
 * The three ways connecting realistically fails each have a different fix, and
 * the driver's own stack trace points at none of them — so they are named here
 * rather than letting an uncaught exception through.
 */
function explainMongoFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/bad auth|Authentication failed/i.test(message)) {
    return [
      "MongoDB rejected the credentials in MONGODB_URI.",
      "",
      "The username and password must belong to a database user, created in",
      "Atlas under Database Access. That is not the same as your Atlas account",
      "login. Check the user exists and the password matches, and remember to",
      "percent-encode any @ : / ? # or % characters in the password.",
    ].join("\n");
  }

  if (/ETIMEDOUT|ECONNREFUSED|ECONNRESET|ServerSelection|timed out/i.test(message)) {
    return [
      "Could not reach the MongoDB server.",
      "",
      "Usually the IP access list: in Atlas under Network Access, add this",
      "machine's IP, or 0.0.0.0/0 for a host with no fixed outbound IP. A",
      "paused free cluster looks the same, so check it is running too.",
    ].join("\n");
  }

  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(message)) {
    return [
      "Could not resolve the MongoDB hostname in MONGODB_URI.",
      "",
      "Check the cluster address for typos, and that this machine has DNS and",
      "internet access.",
    ].join("\n");
  }

  return `Could not connect to MongoDB: ${message}`;
}

// Connect before listening, so a bad URI or a blocked IP fails at startup
// rather than becoming a confusing 500 on the first request.
let store: MongoStore;
try {
  store = await MongoStore.connect(mongoUri, readEnv("MONGODB_DB"));
} catch (err) {
  console.error("\n" + explainMongoFailure(err) + "\n");
  process.exit(1);
}
console.log("connected to MongoDB");
reportAdvisorConfig();

serve({ port }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/")) {
    return await handleApiRequest(req, store);
  }

  return await serveStatic(req, clientDist);
});
