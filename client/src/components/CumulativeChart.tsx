import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../lib/format";
import type { MonthSummary } from "../types";

function compactCurrency(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
  }
  return formatCurrency(amount, currency);
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <div className="font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>
        Day {label}
      </div>
      <div className="font-semibold tabular-nums">{formatCurrency(payload[0].value, currency)} spent</div>
    </div>
  );
}

export function CumulativeChart({ summary, currency }: { summary: MonthSummary; currency: string }) {
  const { dailyCumulative, income, daysInMonth, today, isCurrentMonth } = summary;

  const data = dailyCumulative.map((point) => ({
    day: point.day,
    spent: !isCurrentMonth || today === null || point.day <= today ? point.cumulativeSpent : null,
    budgetPace: income.total > 0 ? (income.total / daysInMonth) * point.day : 0,
  }));

  const tickInterval = Math.max(0, Math.ceil(daysInMonth / 6) - 1);

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Cumulative spending
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: "var(--series-1)" }} />
            Spent
          </span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span
              className="inline-block h-0.5 w-3 rounded-full"
              style={{ background: "var(--baseline)", opacity: 0.9 }}
            />
            Budget pace
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis
            dataKey="day"
            interval={tickInterval}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => compactCurrency(v, currency)}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          {income.total > 0 && (
            <ReferenceLine
              y={income.total}
              stroke="var(--muted)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "Income", position: "insideTopRight", fontSize: 11, fill: "var(--muted)" }}
            />
          )}
          <Line
            type="linear"
            dataKey="budgetPace"
            stroke="var(--baseline)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="spent"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#spentFill)"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          {isCurrentMonth && today !== null && (
            <ReferenceLine x={today} stroke="var(--border)" strokeWidth={1} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
