import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildAccumulation, type AccumulationPoint } from "../lib/accumulation";
import { monthLabel } from "../lib/format";
import type { Money } from "../lib/money";
import type { MonthSummary } from "../types";

function CustomTooltip({
  active,
  payload,
  money,
}: {
  active?: boolean;
  payload?: { payload: AccumulationPoint }[];
  money: Money;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const signedKept = `${point.kept < 0 ? "−" : "+"}${money.format(Math.abs(point.kept))}`;

  return (
    <div
      className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs shadow-sm"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <div className="font-medium" style={{ color: "var(--text-secondary)" }}>
        {monthLabel(point.month)}
        {point.inProgress ? " · still running" : ""}
      </div>
      <div className="font-display font-bold tabular-nums">
        {money.format(point.cumulative)} total
      </div>
      <div
        className="tabular-nums"
        style={{ color: point.kept < 0 ? "var(--status-critical)" : "var(--text-secondary)" }}
      >
        {signedKept} that month
      </div>
    </div>
  );
}

/**
 * The running total of what is left after spending, month on month: each month's
 * leftover added to everything before it. A month that overspends pulls the line
 * back down, so the slope reads as whether the habit is actually accumulating.
 */
export function KeptAccumulationChart({
  summaries,
  money,
}: {
  summaries: MonthSummary[];
  money: Money;
}) {
  const { points, total, since, endsInProgress } = buildAccumulation(summaries);

  if (points.length < 2) return null;

  const lowest = Math.min(...points.map((p) => p.cumulative));
  const everNegative = lowest < 0;
  const tone = total < 0 ? "var(--status-critical)" : "var(--status-good)";

  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}>
      <div className="mb-3 flex flex-col gap-0.5">
        <h3 className="font-display text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Adding up what is left
        </h3>
        <span className="font-display text-2xl font-extrabold tabular-nums" style={{ color: tone }}>
          {money.format(total)}
        </span>
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          Kept since {since ? monthLabel(since) : "the start"}
          {endsInProgress ? ", this month still running" : ""}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={points} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="keptFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--status-good)" stopOpacity={0.26} />
              <stop offset="100%" stopColor="var(--status-good)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--gridline)" />
          <XAxis
            dataKey="label"
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
          {/* Only worth drawing when the total actually went underwater. */}
          {everNegative && <ReferenceLine y={0} stroke="var(--status-critical)" strokeWidth={1.5} />}
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="var(--status-good)"
            strokeWidth={2.5}
            fill="url(#keptFill)"
            isAnimationActive={false}
            dot={{ r: 2.5, fill: "var(--status-good)", strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
