import type { AdvisorAction, AdvisorMessage, AdvisorThread } from "../../shared/types.ts";
import { advisorThreadKey } from "../lib/keys.ts";
import { buildSnapshotText } from "../lib/snapshot.ts";
import { buildSystemInstruction, STARTER_PROMPTS } from "../lib/advisor-prompt.ts";
import { AdvisorError, advisorConfigured, advisorModel } from "../lib/nvidia.ts";
import { runAdvisorTurn } from "../lib/advisor-agent.ts";
import { applyAction } from "../lib/advisor-tools.ts";
import { todayDateString } from "../lib/aggregate.ts";
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

/** The snapshot verbatim, so the user can see exactly what is sent to the model. */
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
    const turn = await runAdvisorTurn(kv, buildSystemInstruction(snapshot, todayDateString()), history);
    reply = {
      id: ulid(),
      role: "advisor",
      // A model that proposes a change and stops without a word still owes
      // the user a sentence, or the card would appear with no explanation.
      text: turn.text || (turn.actions.length > 0 ? "I've set this up for you to confirm:" : ""),
      createdAt: new Date().toISOString(),
      ...(turn.lookups.length > 0 ? { lookups: turn.lookups } : {}),
      ...(turn.actions.length > 0 ? { actions: turn.actions } : {}),
    };
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

/** Finds a proposed action anywhere in the thread, with the message holding it. */
function findAction(messages: AdvisorMessage[], id: string): { message: AdvisorMessage; action: AdvisorAction } | null {
  for (const message of messages) {
    const action = message.actions?.find((a) => a.id === id);
    if (action) return { message, action };
  }
  return null;
}

/**
 * Settles one proposal. Confirming applies it through the app's own handler;
 * either way the outcome is written back onto the message, so the chat and the
 * model's view of past turns both show what really happened.
 */
async function resolveAction(kv: Store, id: string, confirm: boolean): Promise<Response> {
  const thread = await readThread(kv);
  const found = findAction(thread.messages, id);
  if (!found) return json({ error: "That suggestion is no longer in the chat." }, 404);

  const { action } = found;
  // Only a pending proposal can be decided, so a double tap cannot save twice.
  if (action.status !== "pending") return json({ error: "That suggestion was already handled.", action }, 409);

  if (confirm) {
    const result = await applyAction(action, kv);
    if ("error" in result) {
      action.status = "failed";
      action.error = result.error;
    } else {
      action.status = "applied";
    }
  } else {
    action.status = "dismissed";
  }
  action.resolvedAt = new Date().toISOString();

  await kv.set(advisorThreadKey(), { messages: thread.messages, updatedAt: new Date().toISOString() });
  // 200 even when saving failed: the request did its job, and the reason is on
  // the action for the chat to show where the user pressed Confirm.
  return json({ action });
}

export async function confirmAdvisorActionHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  return await resolveAction(kv, params.id, true);
}

export async function dismissAdvisorActionHandler(
  _req: Request,
  kv: Store,
  params: Record<string, string>,
): Promise<Response> {
  return await resolveAction(kv, params.id, false);
}
