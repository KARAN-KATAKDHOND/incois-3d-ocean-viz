// === Comparison Chart ===
// Model vs Observation profiles with statistical metrics.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { ComparisonData } from '../types/ocean';

interface ComparisonChartProps {
  data: ComparisonData;
}

export function ComparisonChart({ data }: ComparisonChartProps) {
  const chartData = data.observation_profile.map((obs, i) => ({
    depth: obs.depth,
    observation: obs.value,
    model: data.model_profile[i]?.value,
  }));

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center py-1.5 rounded-lg" style={{
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.15)',
        }}>
          <div className="text-[9px] uppercase" style={{ color: '#4b9cd3' }}>RMSE</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#00e5ff' }}>
            {data.rmse.toFixed(3)}
          </div>
        </div>
        <div className="text-center py-1.5 rounded-lg" style={{
          background: 'rgba(255, 109, 0, 0.08)',
          border: '1px solid rgba(255, 109, 0, 0.15)',
        }}>
          <div className="text-[9px] uppercase" style={{ color: '#4b9cd3' }}>Bias</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#ff6d00' }}>
            {data.bias > 0 ? '+' : ''}{data.bias.toFixed(3)}
          </div>
        </div>
        <div className="text-center py-1.5 rounded-lg" style={{
          background: 'rgba(0, 200, 83, 0.08)',
          border: '1px solid rgba(0, 200, 83, 0.15)',
        }}>
          <div className="text-[9px] uppercase" style={{ color: '#4b9cd3' }}>Correlation</div>
          <div className="text-sm font-mono font-bold" style={{ color: '#00c853' }}>
            {data.correlation.toFixed(3)}
          </div>
        </div>
      </div>

      <div className="text-[9px] text-center mb-1" style={{ color: '#4b9cd3' }}>
        N = {data.n_observations} observations • {data.is_demo ? 'DEMO metrics' : 'Computed metrics'}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(42, 108, 176, 0.15)" />
          <XAxis
            type="number"
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
            labelFormatter={(d) => `Depth: ${d} m`}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', color: '#7ec8e3' }}
          />
          <Line
            type="monotone"
            dataKey="model"
            name="Model"
            stroke="#ff6d00"
            strokeWidth={2}
            dot={{ r: 2 }}
            strokeDasharray="5 3"
          />
          <Line
            type="monotone"
            dataKey="observation"
            name="Observation"
            stroke="#00e5ff"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
