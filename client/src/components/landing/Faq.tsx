import { useState } from "react";

export interface FaqEntry {
  question: string;
  answer: string;
}

function FaqItem({ entry, open, onToggle }: { entry: FaqEntry; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border" style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-display text-sm font-semibold sm:text-base" style={{ color: "var(--text-primary)" }}>
          {entry.question}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2.4}
          className="shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "none" }}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {entry.answer}
        </p>
      )}
    </div>
  );
}

export function Faq({ entries }: { entries: FaqEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <FaqItem
          key={entry.question}
          entry={entry}
          open={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  );
}
