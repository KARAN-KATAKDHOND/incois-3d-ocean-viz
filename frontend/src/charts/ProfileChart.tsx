// === Profile Chart ===
// Depth vs Variable profile using Recharts.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ProfileData } from '../types/ocean';

interface ProfileChartProps {
  data: ProfileData;
}

export function ProfileChart({ data }: ProfileChartProps) {
  const chartData = data.profile.map((p) => ({
    depth: p.depth,
    value: p.value,
    quality: p.quality,
  }));

  return (
    <div>
      <div className="text-[10px] font-semibold mb-1 uppercase" style={{ color: '#4b9cd3' }}>
        Depth vs {data.variable} ({data.unit})
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(42, 108, 176, 0.15)" />
          <XAxis
            type="number"
            dataKey="value"
            tick={{ fontSize: 10, fill: '#4b9cd3' }}
            stroke="rgba(42, 108, 176, 0.3)"
            label={{
              value: `${data.variable} (${data.unit})`,
              position: 'insideBottom',
              offset: -2,
              fontSize: 10,
              fill: '#7ec8e3',
            }}
          />
          <YAxis
            type="number"
            dataKey="depth"
            reversed
            tick={{ fontSize: 10, fill: '#4b9cd3' }}
            stroke="rgba(42, 108, 176, 0.3)"
            label={{
              value: 'Depth (m)',
              angle: -90,
              position: 'insideLeft',
              fontSize: 10,
              fill: '#7ec8e3',
            }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10, 22, 40, 0.95)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#e0f4fa',
            }}
            formatter={(value: any) => [`${Number(value).toFixed(2)} ${data.unit}`, data.variable]}
            labelFormatter={(depth) => `Depth: ${depth} m`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#00e5ff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#00e5ff', stroke: '#0a1628', strokeWidth: 1 }}
            activeDot={{ r: 5, fill: '#00e5ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
