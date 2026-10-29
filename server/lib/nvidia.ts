import { readEnv, nvidiaApiKey } from "./env.ts";

const DEFAULT_MODEL = "nvidia/nemotron-3.5-bolt-e4b";
// OpenAI-compatible chat completions endpoint for NVIDIA-hosted models.
const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

/** Retryable statuses: 503 is transient load, 429 is a quota window. */
const RETRY_STATUSES = new Set([429, 502, 503]);
const MAX_ATTEMPTS = 3;

export class AdvisorError extends Error {
  // Declared and assigned explicitly rather than as a constructor parameter
  // property: Node strips types without transforming, so only erasable syntax
  // is allowed.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function advisorModel(): string {
  return readEnv("NVIDIA_MODEL") ?? DEFAULT_MODEL;
}

export function advisorConfigured(): boolean {
  return Boolean(nvidiaApiKey());
}

/** One function call the model asked for, in the OpenAI-compatible shape. */
export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** A tool the model may call, described by a JSON schema. */
export interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

/** What one completion produced: an answer, or calls to make first. */
export interface Completion {
  text: string;
  toolCalls: ToolCall[];
}

interface ChatResponse {
  choices?: {
    message?: { content?: string | null; tool_calls?: ToolCall[] };
    finish_reason?: string;
  }[];
  error?: { message?: string } | string;
  detail?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reasoning models may inline their thinking; only the answer is shown. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function errorText(payload: ChatResponse): string {
  if (typeof payload.error === "string") return payload.error;
  return payload.error?.message ?? payload.detail ?? "";
}

/**
 * Remembers a model that refused tool definitions, so later turns go straight
 * to plain chat instead of paying for a rejected request every time.
 */
const toolsUnsupported = new Set<string>();

/**
 * Plain chat, for a model that cannot take tools: replayed tool calls and their
 * results are dropped, since such a model would reject them too.
 */
function withoutToolTraffic(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.role !== "tool" && !(m.role === "assistant" && m.tool_calls?.length));
}

/**
 * One chat completion against the NVIDIA-hosted model.
 *
 * Tools are offered when given; `toolChoice: "none"` keeps them defined (so
 * earlier tool messages stay valid) while requiring a written answer. A model
 * that does not support function calling rejects the request outright, so that
 * case falls back to plain chat rather than taking the whole advisor down.
 */
export async function complete(
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  toolChoice: "auto" | "none" = "auto",
): Promise<Completion> {
  const key = nvidiaApiKey();
  if (!key) throw new AdvisorError("The advisor is not configured on this server.", 501);

  const model = advisorModel();
  let offerTools = Boolean(tools?.length) && !toolsUnsupported.has(model);

  let lastStatus = 502;
  let lastMessage = "The advisor could not be reached.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const body = {
      model,
      messages: offerTools ? messages : withoutToolTraffic(messages),
      temperature: 0.4,
      max_tokens: 4096,
      stream: false,
      ...(offerTools ? { tools, tool_choice: toolChoice } : {}),
    };

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (err) {
      lastStatus = 504;
      lastMessage = err instanceof Error && err.name === "TimeoutError"
        ? "The advisor took too long to answer. Try again."
        : "Could not reach the advisor. Check the server's internet connection.";
      if (attempt < MAX_ATTEMPTS) {
        await sleep(1500 * attempt);
        continue;
      }
      break;
    }

    const payload = (await res.json().catch(() => ({}))) as ChatResponse;

    if (res.ok) {
      const choice = payload.choices?.[0];
      const text = stripThinking(choice?.message?.content ?? "");
      const toolCalls = (choice?.message?.tool_calls ?? []).filter((c) => c?.function?.name);

      if (text || toolCalls.length > 0) return { text, toolCalls };

      // A 200 with no text means the model stopped for a reason of its own.
      const reason = choice?.finish_reason;
      if (reason === "length") {
        throw new AdvisorError("The answer was cut short. Try asking something narrower.", 502);
      }
      if (reason === "content_filter") {
        throw new AdvisorError("The advisor declined to answer that one.", 422);
      }
      throw new AdvisorError("The advisor returned an empty answer. Try again.", 502);
    }

    lastStatus = res.status;
    const raw = errorText(payload);

    if (res.status === 400 && offerTools) {
      console.warn(`advisor: ${model} rejected tool definitions (${raw || "400"}); continuing without tools.`);
      toolsUnsupported.add(model);
      offerTools = false;
      attempt--; // Not the model's fault, so it does not use up a retry.
      continue;
    }

    if (res.status === 429) {
      lastMessage = "The advisor has hit its usage limit for now. Try again in a few minutes.";
    } else if (res.status === 502 || res.status === 503) {
      lastMessage = "The advisor is busy. Try again in a moment.";
    } else if (res.status === 401 || res.status === 403) {
      // Not retryable and the cause is configuration, so say so precisely.
      throw new AdvisorError("The advisor's API key was rejected. Check NVIDIA_API_KEY.", 502);
    } else if (res.status === 404) {
      throw new AdvisorError(
        `The model ${model} is not available to this key. Set NVIDIA_MODEL to a current model.`,
        502,
      );
    } else {
      lastMessage = raw ? `The advisor failed: ${raw}` : "The advisor failed.";
    }

    if (!RETRY_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) break;
    await sleep(res.status === 429 ? 4000 * attempt : 1500 * attempt);
  }

  throw new AdvisorError(lastMessage, lastStatus === 429 ? 429 : 502);
}
