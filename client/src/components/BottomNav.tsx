import type { ReactNode } from "react";

export type ViewKey = "dashboard" | "add" | "expenses" | "fixed" | "advisor" | "settings";

const TABS: { key: ViewKey; label: string; icon: ReactNode }[] = [
  {
    key: "dashboard",
    label: "Month",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12 12 4l9 8M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"
      />
    ),
  },
  {
    key: "add",
    label: "Add",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />,
  },
  {
    key: "expenses",
    label: "Spend",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 4h14v16l-3.5-2-3.5 2-3.5-2L5 20V4Z M8 9h8M8 13h5"
      />
    ),
  },
  {
    key: "fixed",
    label: "Fixed",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 2l4 4-4 4M21 6H9a4 4 0 0 0-4 4v1M7 22l-4-4 4-4M3 18h12a4 4 0 0 0 4-4v-1"
      />
    ),
  },
  {
    key: "advisor",
    label: "Advice",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
      />
    ),
  },
  {
    key: "settings",
    label: "Setup",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        />
      </>
    ),
  },
];

export function BottomNav({ active, onChange }: { active: ViewKey; onChange: (key: ViewKey) => void }) {
  return (
    <nav
      className="pane-bottom fixed bottom-0 inset-x-0 z-20 border-t"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-6">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className="relative flex flex-col items-center gap-1 py-2.5 min-h-16 transition-colors"
              style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
              aria-current={isActive}
            >
              {/* A top marker rather than a filled pill, to match the squarer chrome */}
              {isActive && (
                <span
                  className="absolute top-0 h-0.5 w-6 rounded-full"
                  style={{ background: "var(--accent)" }}
                  aria-hidden
                />
              )}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                {tab.icon}
              </svg>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
