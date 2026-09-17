import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Money } from "../lib/money";
import type { MonthSummary } from "../types";

function CustomTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: number;
  money: Money;
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
      <div className="font-semibold tabular-nums">{money.format(payload[0].value)} spent</div>
    </div>
  );
}

export function CumulativeChart({ summary, money }: { summary: MonthSummary; money: Money }) {
  const { dailyCumulative, budget, daysInMonth, today, isCurrentMonth } = summary;

  // Pace and the ceiling line both track the spendable budget — income less the
  // fixed commitments — since that is the money this chart is about.
  const data = dailyCumulative.map((point) => ({
    day: point.day,
    spent: !isCurrentMonth || today === null || point.day <= today ? point.cumulativeSpent : null,
    budgetPace: budget > 0 ? (budget / daysInMonth) * point.day : 0,
  }));

  const tickInterval = Math.max(0, Math.ceil(daysInMonth / 6) - 1);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Spending against budget
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: "var(--accent)" }} />
            Spent
          </span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span
              className="inline-block h-0.5 w-3 rounded-full"
              style={{ background: "var(--baseline)", opacity: 0.9 }}
            />
            Even pace
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
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
            tickFormatter={(v) => money.compact(v)}
          />
          <Tooltip content={<CustomTooltip money={money} />} />
          {budget > 0 && (
            <ReferenceLine
              y={budget}
              stroke="var(--muted)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "Spendable", position: "insideTopRight", fontSize: 11, fill: "var(--muted)" }}
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
            stroke="var(--accent)"
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
