import type { AdvisorMessage, AdvisorThread } from "../../shared/types.ts";
import { advisorThreadKey } from "../lib/keys.ts";
import { buildSnapshotText } from "../lib/snapshot.ts";
import { buildSystemInstruction, STARTER_PROMPTS } from "../lib/advisor-prompt.ts";
import { AdvisorError, advisorConfigured, advisorModel, generateAdvice } from "../lib/gemini.ts";
import { json } from "../lib/http.ts";
import { ulid } from "../lib/ulid.ts";
import type { Store } from "../lib/store.ts";

/** Turns kept in the thread. Older ones are dropped from both KV and context. */
const MAX_TURNS = 40;
const MAX_QUESTION_LENGTH = 2000;

async function readThread(kv: Store): Promise<{ messages: AdvisorMessage[]; updatedAt: string | null }> {
  const entry = await kv.get<{ messages: AdvisorMessage[]; updatedAt: string }>(advisorThreadKey());
  return entry.value ?? { messages: [], updatedAt: null };
}

export async function getAdvisorThreadHandler(_req: Request, kv: Store): Promise<Response> {
  const thread = await readThread(kv);
  const body: AdvisorThread & { starters: string[]; model: string } = {
    ...thread,
    enabled: advisorConfigured(),
    starters: STARTER_PROMPTS,
    model: advisorModel(),
  };
  return json(body);
}

/** The snapshot verbatim, so the user can see exactly what is sent to Gemini. */
export async function getAdvisorContextHandler(_req: Request, kv: Store): Promise<Response> {
  return json({ snapshot: await buildSnapshotText(kv) });
}

export async function postAdvisorMessageHandler(req: Request, kv: Store): Promise<Response> {
  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();

  if (!text) return json({ error: "text is required" }, 400);
  if (text.length > MAX_QUESTION_LENGTH) {
    return json({ error: `Keep questions under ${MAX_QUESTION_LENGTH} characters.` }, 400);
  }
  if (!advisorConfigured()) {
    return json({ error: "The advisor is not configured on this server." }, 501);
  }

  const thread = await readThread(kv);
  const question: AdvisorMessage = {
    id: ulid(),
    role: "user",
    text,
    createdAt: new Date().toISOString(),
  };

  // The snapshot is rebuilt on every turn, so advice always reflects the
  // figures as they are now rather than as they were when the chat started.
  const snapshot = await buildSnapshotText(kv);
  const history = [...thread.messages, question].slice(-MAX_TURNS);

  let reply: AdvisorMessage;
  try {
    const answer = await generateAdvice(buildSystemInstruction(snapshot), history);
    reply = { id: ulid(), role: "advisor", text: answer, createdAt: new Date().toISOString() };
  } catch (err) {
    const status = err instanceof AdvisorError ? err.status : 502;
    const message = err instanceof Error ? err.message : "The advisor failed.";
    // The question is still persisted, so the UI can offer a retry with the
    // user's text intact instead of losing what they typed.
    await kv.set(advisorThreadKey(), {
      messages: [...thread.messages, question].slice(-MAX_TURNS),
      updatedAt: new Date().toISOString(),
    });
    return json({ error: message, question }, status);
  }

  const messages = [...thread.messages, question, reply].slice(-MAX_TURNS);
  await kv.set(advisorThreadKey(), { messages, updatedAt: new Date().toISOString() });

  return json({ question, reply });
}

export async function deleteAdvisorThreadHandler(_req: Request, kv: Store): Promise<Response> {
  await kv.delete(advisorThreadKey());
  return json({ ok: true });
}
