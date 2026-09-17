import type { ReactNode } from "react";

export function BottomSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(11,11,11,0.4)" }}
      />
      <div
        className="relative w-full max-w-md rounded-t-2xl border-t px-5 pt-4 pb-8 flex flex-col gap-4 max-h-[90svh] overflow-y-auto"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full shrink-0" style={{ background: "var(--gridline)" }} />
        {children}
      </div>
    </div>
  );
}
