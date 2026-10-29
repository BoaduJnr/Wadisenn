import { useCallback, useEffect, useState } from "react";
import {
  clearAdvisorThread,
  confirmAdvisorAction,
  dismissAdvisorAction,
  getAdvisorThread,
  sendAdvisorMessage,
} from "../api";
import type { AdvisorAction, AdvisorMessage } from "../types";

/** Swaps one action's new state into whichever message holds it. */
function withAction(messages: AdvisorMessage[], updated: AdvisorAction): AdvisorMessage[] {
  return messages.map((m) =>
    m.actions?.some((a) => a.id === updated.id)
      ? { ...m, actions: m.actions.map((a) => (a.id === updated.id ? updated : a)) }
      : m,
  );
}

/** `onApplied` runs after a confirmed change is saved, so other views can refresh. */
export function useAdvisor(onApplied?: () => void) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAdvisorThread()
      .then((thread) => {
        setMessages(thread.messages);
        setStarters(thread.starters);
        setEnabled(thread.enabled);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Show the question straight away; a reply can take several seconds.
    const pending: AdvisorMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, pending]);
    setSending(true);
    setError(null);

    try {
      const { question, reply } = await sendAdvisorMessage(trimmed);
      setMessages((current) => [...current.filter((m) => m.id !== pending.id), question, reply]);
    } catch (err) {
      // The question stays on screen so it can be retried as typed.
      setError(err instanceof Error ? err.message : "The advisor failed.");
    } finally {
      setSending(false);
    }
  }, [sending]);

  /** Drop the last unanswered question and ask it again. */
  const retry = useCallback(async () => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    setMessages((current) => current.slice(0, -1));
    await send(last.text);
  }, [messages, send]);

  /**
   * Confirms or dismisses a proposal. A failure to save still comes back with
   * the action, now marked failed with the reason, so it is shown on the card.
   */
  const resolve = useCallback(
    async (id: string, confirm: boolean) => {
      try {
        const { action } = await (confirm ? confirmAdvisorAction(id) : dismissAdvisorAction(id));
        setMessages((current) => withAction(current, action));
        if (action.status === "applied") onApplied?.();
      } catch (err) {
        // Already handled elsewhere, or gone: re-read the thread for the truth.
        setError(err instanceof Error ? err.message : "Could not update that suggestion.");
        load();
      }
    },
    [onApplied, load],
  );

  const clear = useCallback(async () => {
    await clearAdvisorThread();
    setMessages([]);
    setError(null);
  }, []);

  // A thread can legitimately end on a user message: the server keeps the
  // question when a turn fails, so a previous session's dangling question must
  // offer a retry rather than spin forever waiting for a reply that never came.
  const canRetry = !sending && messages[messages.length - 1]?.role === "user";

  return { messages, starters, enabled, loading, sending, canRetry, error, send, retry, resolve, clear, reload: load };
}
