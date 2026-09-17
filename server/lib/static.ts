import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { Readable } from "node:stream";

/**
 * Serves the built client, replacing the Deno standard library's file server.
 *
 * Small on purpose: this app needs exactly static assets plus an index.html
 * fallback so the SPA survives a hard refresh on /app.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function contentType(path: string): string {
  return CONTENT_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Vite fingerprints asset filenames, so those can be cached hard. Anything
 * else — index.html above all — must revalidate or users get a stale shell
 * pointing at deleted bundles after a deploy.
 */
function cacheControl(pathname: string): string {
  return pathname.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "no-cache";
}

/** Resolves a URL path inside `root`, or null if it escapes. */
function safeJoin(root: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;

  const candidate = resolve(join(root, normalize(decoded)));
  const base = resolve(root);
  // Traversal guard: the result must stay inside root.
  if (candidate !== base && !candidate.startsWith(base + sep)) return null;
  return candidate;
}

async function readFileResponse(
  filePath: string,
  pathname: string,
  method: string,
): Promise<Response | null> {
  let info: Awaited<ReturnType<typeof stat>>;
  try {
    info = await stat(filePath);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;

  const headers = new Headers({
    "content-type": contentType(filePath),
    "content-length": String(info.size),
    "cache-control": cacheControl(pathname),
    "last-modified": info.mtime.toUTCString(),
  });

  // HEAD must report the same headers with no body.
  if (method === "HEAD") return new Response(null, { status: 200, headers });

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, { status: 200, headers });
}

/**
 * Serves `root`, falling back to index.html for anything that is not a file so
 * client-side routes survive a refresh.
 */
export async function serveStatic(req: Request, root: string): Promise<Response> {
  const { pathname } = new URL(req.url);
  const method = req.method;

  if (method !== "GET" && method !== "HEAD") {
    return new Response("method not allowed", { status: 405 });
  }

  const target = safeJoin(root, pathname === "/" ? "/index.html" : pathname);
  if (target) {
    const direct = await readFileResponse(target, pathname, method);
    if (direct) return direct;
  }

  const fallback = safeJoin(root, "/index.html");
  if (fallback) {
    const spa = await readFileResponse(fallback, "/index.html", method);
    if (spa) return spa;
  }

  return new Response("not found", { status: 404 });
}
