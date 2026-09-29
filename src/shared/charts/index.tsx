import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartPoint {
  /** Already formatted for the axis / tooltip. */
  label: string;
  value: number | null;
}

interface Props {
  data: ChartPoint[];
  /** Screen-reader summary; the drawn chart itself is presentational. */
  ariaLabel: string;
  /** Tooltip caption for the value, e.g. "XP". */
  valueName: string;
  height?: number;
}

const axisTick = { fill: 'var(--color-text-muted)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  color: 'var(--color-text)',
};

function Frame({
  ariaLabel,
  height = 200,
  children,
}: Pick<Props, 'ariaLabel' | 'height'> & { children: React.ReactElement }) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Pink bar chart (e.g. XP per day). */
export function BarTrend({ data, ariaLabel, valueName, height }: Props) {
  return (
    <Frame ariaLabel={ariaLabel} height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <Tooltip
          cursor={{ fill: 'var(--color-primary-soft)' }}
          contentStyle={tooltipStyle}
          formatter={(v) => [String(v), valueName]}
        />
        <Bar
          dataKey="value"
          fill="var(--color-primary)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </Frame>
  );
}

/** Line chart on a fixed 0–`max` scale when given (e.g. accuracy 0–100). Gaps stay gaps. */
export function LineTrend({ data, ariaLabel, valueName, height, max }: Props & { max?: number }) {
  return (
    <Frame ariaLabel={ariaLabel} height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={44}
          domain={max ? [0, max] : [0, 'auto']}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), valueName]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-primary-ink)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--color-primary)' }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </Frame>
  );
}
