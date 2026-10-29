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
 * An outcome note that an earlier version appended to the advisor's own text.
 * Models imitate whatever their past turns look like, so with that note in the
 * history they started *writing* proposals instead of calling the tool: no card
 * appeared, and the text falsely claimed the entry was saved. It is stripped
 * from stored history on replay and display, and from any new reply that still
 * produces it.
 */
const OUTCOME_NOTE = /\[Proposed changes\](?:\n- [^\n]*)*/g;

export function stripOutcomeNotes(text: string): string {
  return text.replace(OUTCOME_NOTE, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Replays the stored thread as chat messages.
 *
 * Past proposals are replayed as the tool calls they really were, each followed
 * by its outcome as the tool's result. The model therefore sees itself calling
 * the tool, which is the behaviour to repeat, and learns what was actually
 * saved without any of that being written into its own words.
 */
function toMessages(systemInstruction: string, history: AdvisorMessage[]): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: systemInstruction }];
  for (const m of history) {
    if (m.error || m.text.trim().length === 0) continue;
    if (m.role === "user") {
      messages.push({ role: "user", content: m.text });
      continue;
    }
    const actions = m.actions ?? [];
    if (actions.length > 0) {
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: actions.map((a) => ({
          id: a.id,
          type: "function" as const,
          function: { name: a.tool, arguments: JSON.stringify(a.args) },
        })),
      });
      for (const a of actions) {
        messages.push({
          role: "tool",
          tool_call_id: a.id,
          content: JSON.stringify({ summary: a.summary, outcome: STATUS_WORDS[a.status] }),
        });
      }
    }
    messages.push({ role: "assistant", content: stripOutcomeNotes(m.text) });
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
    // On the last step tool calls are switched off, so the model has to answer
    // with what it has rather than running out of steps mid-lookup.
    const finalStep = step === MAX_STEPS - 1;
    const { text, toolCalls } = await complete(messages, ADVISOR_TOOLS, finalStep ? "none" : "auto");

    if (toolCalls.length === 0) {
      return { text: stripOutcomeNotes(text), lookups, actions };
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
