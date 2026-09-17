import { useEffect, useRef, useState, type FormEvent } from "react";
import { getAdvisorContext } from "../api";
import { AdvisorText } from "../components/AdvisorText";
import { useAdvisor } from "../hooks/useAdvisor";
import type { AdvisorMessage } from "../types";

function Bubble({ message }: { message: AdvisorMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed"
          style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className="max-w-[92%] rounded-xl rounded-bl-sm border border-l-2 px-3.5 py-3"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
          borderLeftColor: "var(--brand)",
          color: "var(--text-secondary)",
        }}
      >
        <AdvisorText text={message.text} />
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--brand)",
                animation: "advisorPulse 1.1s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Working through your numbers…
        </span>
      </div>
    </div>
  );
}

/** What the advisor is given, shown verbatim so nothing is sent unseen. */
function ContextPanel({ onClose }: { onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdvisorContext()
      .then((r) => setSnapshot(r.snapshot))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-3"
      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xs font-bold" style={{ color: "var(--text-primary)" }}>
          What the advisor is told
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold"
          style={{ color: "var(--brand)" }}
        >
          Hide
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}
      <pre
        className="max-h-64 overflow-auto text-[10px] leading-snug whitespace-pre-wrap"
        style={{ color: "var(--text-secondary)" }}
      >
        {snapshot ?? "Loading…"}
      </pre>
    </div>
  );
}

export function AdvisorView() {
  const { messages, starters, enabled, loading, sending, canRetry, error, send, retry, clear } = useAdvisor();
  const [draft, setDraft] = useState("");
  const [showContext, setShowContext] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-safe pt-4 pb-nav">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Money advisor
          </h1>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Ask about a purchase, a loan either way, or where to put savings. It reads your real figures and
            answers for Ghana.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => void clear()}
            className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Clear
          </button>
        )}
      </div>

      {!showContext ? (
        <button
          type="button"
          onClick={() => setShowContext(true)}
          className="self-start text-[11px] font-semibold"
          style={{ color: "var(--brand)" }}
        >
          See what it can read about you
        </button>
      ) : (
        <ContextPanel onClose={() => setShowContext(false)} />
      )}

      {!enabled && (
        <div
          className="rounded-xl border p-4 text-xs leading-relaxed"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--status-serious)",
            color: "var(--text-secondary)",
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>The advisor is switched off.</strong> Set a{" "}
          <code>GEMINI_API_KEY</code> environment variable on the server and restart it. Everything else in
          Wadisenn works without one.
        </div>
      )}

      {loading && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </p>
      )}

      {!loading && enabled && messages.length === 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Try asking
          </span>
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => void send(starter)}
              className="rounded-xl border px-3.5 py-2.5 text-left text-sm"
              style={{
                background: "var(--surface-1)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-3 pt-1">
          {messages.map((message) => <Bubble key={message.id} message={message} />)}
          {sending && <Thinking />}
        </div>
      )}

      {error && (
        <div
          className="flex flex-col gap-2 rounded-xl border p-3"
          style={{ background: "var(--surface-1)", borderColor: "var(--status-critical)" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "var(--status-critical)" }}>
            {error}
          </p>
          {canRetry && (
            <button
              type="button"
              onClick={() => void retry()}
              className="h-9 self-start rounded-lg border px-3 font-display text-xs font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--brand)" }}
            >
              Ask again
            </button>
          )}
        </div>
      )}

      {!error && canRetry && !sending && (
        <button
          type="button"
          onClick={() => void retry()}
          className="h-9 self-start rounded-lg border px-3 font-display text-xs font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--brand)" }}
        >
          Ask again
        </button>
      )}

      <div ref={endRef} />

      <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={2}
          maxLength={2000}
          disabled={!enabled || sending}
          placeholder="Can I afford…?"
          className="min-w-0 flex-1 resize-none rounded-lg border px-3 py-2.5 text-sm disabled:opacity-60"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={!enabled || sending || draft.trim().length === 0}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--on-brand)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Your figures above are sent to Google&rsquo;s Gemini API to produce each answer. This is general
        guidance, not licensed financial advice — confirm big decisions with a SEC-licensed adviser.
      </p>
    </div>
  );
}
