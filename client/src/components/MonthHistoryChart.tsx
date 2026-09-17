import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { monthLabelShort } from "../lib/format";
import type { Money } from "../lib/money";
import type { MonthSummary } from "../types";

const SERIES = [
  { key: "fixed", label: "Fixed", color: "var(--tone-fixed)" },
  { key: "spent", label: "Spent", color: "var(--accent)" },
  { key: "kept", label: "Kept", color: "var(--status-good)" },
] as const;

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  money: Money;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <div className="font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5 font-semibold tabular-nums">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: entry.color }} />
          {SERIES.find((s) => s.key === entry.dataKey)?.label ?? entry.dataKey}:{" "}
          {money.format(entry.value)}
        </div>
      ))}
    </div>
  );
}

/**
 * One stacked bar per month, split the way the money actually split: the fixed
 * commitments that were taken out, the discretionary spending on top of them,
 * and whatever was still there at the end. The three add up to that month's
 * income, so a bar's height is the month's income and its make-up is the story.
 */
export function MonthHistoryChart({ summaries, money }: { summaries: MonthSummary[]; money: Money }) {
  const data = [...summaries]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((s) => ({
      month: monthLabelShort(s.month),
      fixed: s.commitments.total,
      spent: s.totalSpent,
      kept: s.remaining,
    }));

  if (data.length < 2) return null;

  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Where the months went
        </h3>
        <div className="flex items-center gap-2.5 text-[11px]">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: series.color }} />
              {series.label}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
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
            tickFormatter={(v) => money.compact(v)}
          />
          <Tooltip content={<CustomTooltip money={money} />} cursor={{ fill: "var(--gridline)", opacity: 0.5 }} />
          <Bar dataKey="fixed" stackId="month" fill="var(--tone-fixed)" maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="spent" stackId="month" fill="var(--accent)" maxBarSize={28} isAnimationActive={false} />
          <Bar dataKey="kept" stackId="month" maxBarSize={28} isAnimationActive={false} radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.month} fill={entry.kept < 0 ? "var(--status-critical)" : "var(--status-good)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
