import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, monthLabelShort } from "../lib/format";
import type { MonthSummary } from "../types";

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-sm flex flex-col gap-1"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <div className="font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5 font-semibold tabular-nums">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: entry.color }} />
          {entry.dataKey === "spent" ? "Spent" : "Saved"}: {formatCurrency(entry.value, currency)}
        </div>
      ))}
    </div>
  );
}

export function SavingsHistoryChart({ summaries, currency }: { summaries: MonthSummary[]; currency: string }) {
  const data = [...summaries]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((s) => ({
      month: monthLabelShort(s.month),
      spent: s.totalSpent,
      saved: s.remaining,
    }));

  if (data.length < 2) return null;

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Spending vs. saved
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--series-1)" }} />
            Spent
          </span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--series-6)" }} />
            Saved
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)
            }
          />
          <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "var(--gridline)", opacity: 0.5 }} />
          <Bar dataKey="spent" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar dataKey="saved" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.month} fill={entry.saved < 0 ? "var(--status-critical)" : "var(--series-6)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
