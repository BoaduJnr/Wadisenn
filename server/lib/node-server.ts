import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

/**
 * Runs a fetch-style handler on `node:http`.
 *
 * The router and every handler are written against the web `Request`/`Response`
 * pair, which Node has had globally since 18. All that is missing is the
 * translation at the edges, which is what this file is: no framework needed for
 * one entry point.
 */

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

function toRequest(req: IncomingMessage, origin: string): Request {
  const url = new URL(req.url ?? "/", origin);

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) headers.append(name, v);
    else headers.set(name, value);
  }

  const method = req.method ?? "GET";
  return new Request(url, {
    method,
    headers,
    // Node streams are async-iterable, so they convert directly. GET and HEAD
    // must not carry one at all, or Request rejects it.
    body: METHODS_WITHOUT_BODY.has(method) ? undefined : (Readable.toWeb(req) as ReadableStream),
    // Required by undici whenever a stream body is present.
    duplex: "half",
  } as RequestInit & { duplex?: "half" });
}

async function writeResponse(response: Response, res: ServerResponse): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    // set-cookie is the one header that may legitimately repeat.
    if (name.toLowerCase() === "set-cookie") {
      headers["set-cookie"] = response.headers.getSetCookie?.() ?? [value];
    } else {
      headers[name] = value;
    }
  });

  res.writeHead(response.status, headers);

  if (!response.body) {
    res.end();
    return;
  }

  // Stream rather than buffer, so a large static file does not sit in memory.
  const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  nodeStream.pipe(res);
  await new Promise<void>((resolve) => {
    nodeStream.on("end", resolve);
    nodeStream.on("error", () => {
      res.destroy();
      resolve();
    });
  });
}

export function serve(
  { port, hostname = "0.0.0.0" }: { port: number; hostname?: string },
  handler: (req: Request) => Promise<Response> | Response,
): void {
  const server = createServer(async (req, res) => {
    const origin = `http://${req.headers.host ?? `${hostname}:${port}`}`;
    try {
      const response = await handler(toRequest(req, origin));
      await writeResponse(response, res);
    } catch (err) {
      // A throw here means a bug rather than a bad request, so log it fully
      // and still answer, because a hung socket is worse than a 500.
      console.error("unhandled request error:", err);
      if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "internal error" }));
    }
  });

  server.listen(port, hostname, () => {
    console.log(`Wadisenn server listening on http://${hostname}:${port}`);
  });

  // Render and most platforms stop a container with SIGTERM; closing cleanly
  // lets in-flight requests finish instead of being cut off.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.log(`${signal} received, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 10_000).unref();
    });
  }
}
