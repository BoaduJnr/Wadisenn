import type { ReactNode } from "react";

/* Static previews of the app, drawn in markup rather than screenshotted so they
   follow the theme and stay sharp at any size. The numbers are illustrative but
   internally consistent: GHS 5,000 in, GHS 1,630 of monthly fixed costs, a
   GHS 1,800 yearly premium spread at GHS 150 a month, GHS 1,160 spent so far. */

export function MockPanel({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div
      className="relative w-full max-w-sm rounded-2xl border p-4"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
        boxShadow: "0 28px 56px -22px var(--panel-shadow)",
      }}
      role="img"
      aria-label={label ?? "Wadisenn preview"}
    >
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/** One line of the statement: label on the left, signed amount on the right. */
function FlowRow({
  label,
  amount,
  hint,
  deduction,
  subtotal,
  tone,
}: {
  label: string;
  amount: string;
  hint?: string;
  deduction?: boolean;
  subtotal?: boolean;
  tone?: string;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-2"
      style={{ borderTop: subtotal ? "1px solid var(--border)" : undefined }}
    >
      <div className="flex min-w-0 flex-col">
        <span
          className={subtotal ? "font-display text-[13px] font-bold" : "text-[13px]"}
          style={{ color: subtotal ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {label}
        </span>
        {hint && (
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {hint}
          </span>
        )}
      </div>
      <span
        className={`shrink-0 tabular-nums ${subtotal ? "font-display text-sm font-bold" : "text-[13px] font-medium"}`}
        style={{ color: tone ?? (deduction ? "var(--text-secondary)" : "var(--text-primary)") }}
      >
        {deduction ? "− " : ""}
        {amount}
      </span>
    </div>
  );
}

export function DashboardMock() {
  return (
    <MockPanel label="Wadisenn month preview">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
          June 2026
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
          Day 18 of 30
        </span>
      </div>

      <div className="border-l-4 pl-3" style={{ borderColor: "var(--brand)" }}>
        <div className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: "var(--muted)" }}>
          Free to spend
        </div>
        <div className="font-display text-4xl font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
          GHS 2,060
        </div>
        <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          GHS 1,780 fixed and GHS 1,160 spent, out of GHS 5,000
        </div>
      </div>

      <div className="flex flex-col rounded-lg border px-3" style={{ borderColor: "var(--border)" }}>
        <FlowRow label="Income" amount="GHS 5,000" />
        <FlowRow label="Fixed monthly" amount="GHS 1,630" deduction />
        <FlowRow label="Fixed yearly" amount="GHS 150" deduction />
        <FlowRow label="Spendable" amount="GHS 3,220" hint="After fixed costs" subtotal />
        <FlowRow label="Spent so far" amount="GHS 1,160" deduction />
        <FlowRow label="Left" amount="GHS 2,060" subtotal tone="var(--status-good)" />
      </div>

      <div className="h-2 overflow-hidden rounded-sm" style={{ background: "var(--gridline)" }}>
        <div className="h-full" style={{ width: "36%", background: "var(--brand)" }} />
      </div>
    </MockPanel>
  );
}

export function FixedMock() {
  const monthly = [
    { label: "Rent", note: "Day 1 each month", amount: "1,200", color: "var(--series-3)" },
    { label: "Internet", note: "Day 5 each month", amount: "250", color: "var(--series-3)" },
    { label: "Electricity", note: "Every month", amount: "180", color: "var(--series-3)" },
  ];
  const load = [55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55];

  return (
    <MockPanel label="Fixed costs preview">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Fixed costs
        </span>
        <span className="font-display text-sm font-bold tabular-nums" style={{ color: "var(--tone-fixed)" }}>
          GHS 21,360 / yr
        </span>
      </div>

      <div className="rounded-lg border px-3" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        {monthly.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center gap-3 py-2.5"
            style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                {row.label}
              </div>
              <div className="truncate text-[10px]" style={{ color: "var(--muted)" }}>
                {row.note}
              </div>
            </div>
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {row.amount}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
        style={{ background: "var(--brand-soft)", borderColor: "var(--brand)" }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--series-5)" }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            Car insurance
          </div>
          <div className="truncate text-[10px]" style={{ color: "var(--brand)" }}>
            GHS 1,800 a year, spread at GHS 150 a month
          </div>
        </div>
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
          1,800
        </span>
      </div>

      <div>
        <div className="mb-1.5 text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
          Across the year
        </div>
        <div className="flex h-12 items-end gap-1">
          {load.map((height, i) => (
            <div key={i} className="flex flex-1 items-end" style={{ height: "100%" }}>
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: `${height}%`,
                  background: i === 5 ? "var(--brand)" : "var(--tone-fixed)",
                  opacity: i === 5 ? 1 : 0.5,
                }}
                aria-hidden
              />
            </div>
          ))}
        </div>
      </div>
    </MockPanel>
  );
}

export function IncomeMock() {
  const rows = [
    { label: "Salary", amount: "5,000", base: true },
    { label: "Freelance logo", amount: "+900", base: false },
    { label: "Mid-year bonus", amount: "+1,200", base: false },
  ];
  return (
    <MockPanel label="Income setup preview">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Income &middot; June 2026
        </span>
        <span className="font-display text-sm font-bold tabular-nums" style={{ color: "var(--brand)" }}>
          GHS 7,100
        </span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-lg border px-3 py-2.5"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-bold"
              style={{
                background: row.base ? "var(--brand)" : "var(--brand-soft)",
                color: row.base ? "var(--on-brand)" : "var(--brand)",
              }}
              aria-hidden
            >
              {row.base ? "S" : "+"}
            </span>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {row.label}
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                {row.base ? "Default, every month" : "This month only"}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {row.amount}
          </span>
        </div>
      ))}
      <div className="text-[11px]" style={{ color: "var(--muted)" }}>
        A one-off only counts toward the month you put it in.
      </div>
    </MockPanel>
  );
}

export function LogMock() {
  const rows = [
    { category: "Food", note: "Groceries at the market", amount: "180", color: "var(--series-1)" },
    { category: "Transport", note: "Trotro to work", amount: "14", color: "var(--series-2)" },
    { category: "Shopping", note: "Phone charger", amount: "60", color: "var(--series-4)" },
  ];
  return (
    <MockPanel label="Spending log preview">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Thu, 18 Jun
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--muted)" }}>
          GHS 254
        </span>
      </div>
      <div className="rounded-lg border px-3" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
        {rows.map((row, i) => (
          <div
            key={row.category}
            className="flex items-center gap-3 py-3"
            style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {row.category}
              </div>
              <div className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {row.note}
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {row.amount}
            </span>
          </div>
        ))}
      </div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ background: "var(--brand)", color: "var(--on-brand)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        <span className="font-display text-sm font-semibold">Log a spend</span>
      </div>
      <div className="text-[11px]" style={{ color: "var(--muted)" }}>
        Rent is not in this list. It was already taken out.
      </div>
    </MockPanel>
  );
}

export function HistoryMock() {
  // Each bar is one month's income, split fixed / spent / kept.
  const months = [
    { month: "Feb", fixed: 34, spent: 41, kept: 25 },
    { month: "Mar", fixed: 34, spent: 52, kept: 14 },
    { month: "Apr", fixed: 34, spent: 33, kept: 33 },
    { month: "May", fixed: 34, spent: 44, kept: 22 },
    { month: "Jun", fixed: 36, spent: 23, kept: 41 },
  ];
  const series = [
    { key: "fixed" as const, label: "Fixed", color: "var(--tone-fixed)" },
    { key: "spent" as const, label: "Spent", color: "var(--accent)" },
    { key: "kept" as const, label: "Kept", color: "var(--status-good)" },
  ];

  return (
    <MockPanel label="Month history preview">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Where the months went
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex h-36 items-end justify-between gap-3 pt-1">
        {months.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-28 w-2/3 flex-col justify-end overflow-hidden rounded-t-sm">
              <div style={{ height: `${m.kept}%`, background: "var(--status-good)" }} aria-hidden />
              <div style={{ height: `${m.spent}%`, background: "var(--accent)" }} aria-hidden />
              <div style={{ height: `${m.fixed}%`, background: "var(--tone-fixed)" }} aria-hidden />
            </div>
            <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>
              {m.month}
            </span>
          </div>
        ))}
      </div>
      <div
        className="border-l-2 py-1 pl-3 text-[11px] font-medium"
        style={{ borderColor: "var(--brand)", color: "var(--text-secondary)" }}
      >
        Fixed costs barely move. The middle band is the one you control.
      </div>
    </MockPanel>
  );
}

export function AdvisorMock() {
  return (
    <MockPanel label="Money advisor preview">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Money advisor
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
          Reads your figures
        </span>
      </div>

      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-[12px] leading-relaxed"
          style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        >
          Can I afford a GHS 5,000 laptop this month?
        </div>
      </div>

      <div
        className="rounded-lg rounded-bl-sm border border-l-2 px-3 py-2.5"
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--border)",
          borderLeftColor: "var(--brand)",
        }}
      >
        <div className="text-[12px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          <strong>No — not this month.</strong>
        </div>
        <div className="mt-1.5 flex flex-col gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <div className="flex justify-between tabular-nums">
            <span>Free to spend</span>
            <span>GHS 3,490</span>
          </div>
          <div className="flex justify-between tabular-nums">
            <span>The laptop</span>
            <span>− GHS 5,000</span>
          </div>
          <div
            className="flex justify-between pt-1 font-semibold tabular-nums"
            style={{ borderTop: "1px solid var(--border)", color: "var(--status-critical)" }}
          >
            <span>Short by</span>
            <span>GHS 1,510</span>
          </div>
        </div>
        <div className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Don’t reach for a quick loan at 34% APR. At your average GHS 1,570 kept a month, you have it in
          cash by mid-November.
        </div>
      </div>

      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
        Figures from your own records. Ghanaian rates and options.
      </div>
    </MockPanel>
  );
}
