import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { AngleSample } from '@/types/exercise';

interface Props {
  data: AngleSample[];
  /** Optional target angle reference line. */
  target?: number;
  /** Height in pixels. */
  height?: number;
  /** Y-axis domain [min, max]; defaults to auto with padding. */
  yDomain?: [number, number];
  /** Keep only the last N seconds visible (for the live view). */
  windowSeconds?: number;
}

/**
 * Knee-angle-over-time line chart. Used both live (continuously updating) and
 * for replaying a completed session.
 */
export function AngleChart({
  data,
  target,
  height = 260,
  yDomain,
  windowSeconds,
}: Props) {
  let view = data;
  if (windowSeconds && data.length > 0) {
    const latest = data[data.length - 1].t;
    view = data.filter((d) => d.t >= latest - windowSeconds);
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={view} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v: number) => `${Math.round(v)}s`}
          stroke="#64748b"
          fontSize={13}
          allowDecimals={false}
        />
        <YAxis
          domain={yDomain ?? ['auto', 'auto']}
          tickFormatter={(v: number) => `${Math.round(v)}°`}
          stroke="#64748b"
          fontSize={13}
          width={48}
        />
        <Tooltip
          formatter={(value: number) => [`${Math.round(value)}°`, 'Knee angle']}
          labelFormatter={(label: number) => `${label.toFixed(1)} s`}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
        />
        {typeof target === 'number' && (
          <ReferenceLine
            y={target}
            stroke="#d97706"
            strokeDasharray="6 4"
            label={{
              value: `Target ${Math.round(target)}°`,
              position: 'insideTopRight',
              fill: '#d97706',
              fontSize: 12,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="angle"
          stroke="#138a8a"
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
