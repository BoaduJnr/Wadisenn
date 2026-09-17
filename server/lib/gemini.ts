import type { AdvisorMessage } from "../../shared/types.ts";
import { readEnv, geminiApiKey } from "./env.ts";

const DEFAULT_MODEL = "gemini-3.6-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Retryable statuses: 503 is transient load, 429 is a quota window. */
const RETRY_STATUSES = new Set([429, 503]);
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
  return readEnv("GEMINI_MODEL") ?? DEFAULT_MODEL;
}

export function advisorConfigured(): boolean {
  return Boolean(geminiApiKey());
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Turns our stored thread into Gemini's `contents` shape.
 *
 * Failed turns are dropped: a message the model never actually produced must
 * not be replayed to it as if it had.
 */
function toContents(messages: AdvisorMessage[]) {
  return messages
    .filter((m) => !m.error && m.text.trim().length > 0)
    .map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));
}

/**
 * Asks Gemini for the next advisor turn.
 *
 * Search grounding is off by default because the free API tier has no quota
 * for it and every grounded call fails with 429; set ADVISOR_SEARCH=1 on a
 * paid key to let the advisor look up live figures.
 */
export async function generateAdvice(
  systemInstruction: string,
  messages: AdvisorMessage[],
): Promise<string> {
  const key = geminiApiKey();
  if (!key) throw new AdvisorError("The advisor is not configured on this server.", 501);

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: toContents(messages),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  };
  if (readEnv("ADVISOR_SEARCH") === "1") body.tools = [{ google_search: {} }];

  let lastStatus = 502;
  let lastMessage = "The advisor could not be reached.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}/${advisorModel()}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
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

    const payload = (await res.json().catch(() => ({}))) as GeminiResponse;

    if (res.ok) {
      const candidate = payload.candidates?.[0];
      const text = (candidate?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();

      if (text) return text;

      // A 200 with no text means the model stopped for a reason of its own.
      const reason = candidate?.finishReason ?? payload.promptFeedback?.blockReason;
      if (reason === "MAX_TOKENS") {
        throw new AdvisorError("The answer was cut short. Try asking something narrower.", 502);
      }
      if (reason === "SAFETY" || payload.promptFeedback?.blockReason) {
        throw new AdvisorError("The advisor declined to answer that one.", 422);
      }
      throw new AdvisorError("The advisor returned an empty answer. Try again.", 502);
    }

    lastStatus = res.status;
    const raw = payload.error?.message ?? "";

    if (res.status === 429) {
      lastMessage = "The advisor has hit its usage limit for now. Try again in a few minutes.";
    } else if (res.status === 503) {
      lastMessage = "The advisor is busy. Try again in a moment.";
    } else if (res.status === 401 || res.status === 403) {
      // Not retryable and the cause is configuration, so say so precisely.
      throw new AdvisorError("The advisor's API key was rejected. Check GEMINI_API_KEY.", 502);
    } else if (res.status === 404) {
      throw new AdvisorError(
        `The model ${advisorModel()} is not available to this key. Set GEMINI_MODEL to a current model.`,
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
