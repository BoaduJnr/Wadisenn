import { navigate } from "../lib/navigation";

export function AppHeader() {
  return (
    <header
      className="pane-top sticky top-0 z-20 border-b backdrop-blur-lg"
      style={{ background: "var(--header-plane)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="px-safe mx-auto flex h-14 max-w-md items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md font-display text-xs font-extrabold"
            style={{ background: "var(--brand)", color: "var(--on-brand)" }}
            aria-hidden
          >
            W
          </span>
          <span className="font-display text-base font-bold tracking-tight" style={{ color: "#ffffff" }}>
            Wadisenn<span style={{ color: "var(--brand)" }}>.</span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.82)" }}
        >
          About
        </button>
      </div>
    </header>
  );
}
