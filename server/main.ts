import { serveDir } from "@std/http/file-server";
import { getKv } from "./lib/kv.ts";
import { handleApiRequest } from "./router.ts";

const kv = await getKv();
const clientDist = "./client/dist";

Deno.serve({ port: 8000 }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/")) {
    return await handleApiRequest(req, kv);
  }

  const res = await serveDir(req, { fsRoot: clientDist, quiet: true });
  if (res.status === 404) {
    return await serveDir(
      new Request(new URL("/index.html", url), req),
      { fsRoot: clientDist, quiet: true },
    );
  }
  return res;
});

console.log("Wadisenn server listening on http://localhost:8000");
