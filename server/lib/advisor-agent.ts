import type { AdvisorAction, AdvisorMessage } from "../../shared/types.ts";
import { ADVISOR_TOOLS, isActionTool, prepareAction, runLookup } from "./advisor-tools.ts";
import { AdvisorError, complete, type ChatMessage } from "./nvidia.ts";
import { ulid } from "./ulid.ts";
import type { Store } from "./store.ts";

/**
 * Model calls allowed in one turn. Each lookup costs one, so this bounds a
 * model that keeps calling tools instead of answering.
 */
const MAX_STEPS = 6;

/** Proposals the user has not yet decided on, said in words the model reads. */
const STATUS_WORDS: Record<AdvisorAction["status"], string> = {
  pending: "proposed, awaiting the user's confirmation",
  applied: "confirmed by the user and saved",
  dismissed: "dismissed by the user, not saved",
  failed: "confirmed but failed to save",
};

/**
 * Replays the stored thread as chat messages.
 *
 * Only the visible text is stored, not the raw tool traffic, so each past
 * proposal is restated alongside its outcome. That way the model knows what
 * was actually saved, and never assumes a dismissed proposal went through.
 */
function toMessages(systemInstruction: string, history: AdvisorMessage[]): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: systemInstruction }];
  for (const m of history) {
    if (m.error || m.text.trim().length === 0) continue;
    if (m.role === "user") {
      messages.push({ role: "user", content: m.text });
      continue;
    }
    const outcomes = (m.actions ?? []).map((a) => `- ${a.summary}: ${STATUS_WORDS[a.status]}`);
    const content = outcomes.length > 0 ? `${m.text}\n\n[Proposed changes]\n${outcomes.join("\n")}` : m.text;
    messages.push({ role: "assistant", content });
  }
  return messages;
}

function parseArgs(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface AgentTurn {
  text: string;
  lookups: string[];
  actions: AdvisorAction[];
}

/**
 * One advisor turn: ask the model, run any lookups it wants, collect any
 * changes it proposes, and repeat until it answers in words.
 */
export async function runAdvisorTurn(
  kv: Store,
  systemInstruction: string,
  history: AdvisorMessage[],
): Promise<AgentTurn> {
  const messages = toMessages(systemInstruction, history);
  const lookups: string[] = [];
  const actions: AdvisorAction[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    // On the last step tools are withheld, so the model has to answer with
    // what it has rather than running out of steps mid-lookup.
    const finalStep = step === MAX_STEPS - 1;
    const { text, toolCalls } = await complete(messages, finalStep ? undefined : ADVISOR_TOOLS);

    if (toolCalls.length === 0) {
      return { text, lookups, actions };
    }

    messages.push({ role: "assistant", content: text || null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = parseArgs(call.function.arguments);
      let result: unknown;

      if (!args) {
        result = { error: "arguments were not valid JSON" };
      } else if (isActionTool(name)) {
        const prepared = await prepareAction(name, args, kv);
        if ("error" in prepared) {
          result = { error: prepared.error };
        } else {
          actions.push({ id: ulid(), tool: name, args: prepared.args, summary: prepared.summary, status: "pending" });
          result = {
            status: "proposed",
            summary: prepared.summary,
            note: "Shown to the user with a Confirm button. It is NOT saved yet; do not say it is.",
          };
        }
      } else {
        const lookup = await runLookup(name, args, kv);
        if (!lookups.includes(lookup.label)) lookups.push(lookup.label);
        result = lookup.result;
      }

      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  // Only reachable if the final, tool-less step still produced no text.
  throw new AdvisorError("The advisor could not settle on an answer. Try asking more simply.", 502);
}
