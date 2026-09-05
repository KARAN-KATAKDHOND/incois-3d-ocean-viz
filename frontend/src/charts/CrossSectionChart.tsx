// === Cross-Section Chart ===
// Distance vs Depth heatmap for cross-section visualization.

import { useState, useEffect } from 'react';
import { modelApi } from '../services/api';
import { getColormapCSS } from '../utils/colormaps';
import { useOceanStore } from '../stores/oceanStore';
import type { CrossSectionData } from '../types/ocean';

export function CrossSectionChart() {
  const [data, setData] = useState<CrossSectionData | null>(null);
  const crossSection = useOceanStore((s) => s.crossSection);
  const variable = useOceanStore((s) => s.variable);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const colorbar = useOceanStore((s) => s.colorbar);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!crossSection.enabled || variable === 'currents') return;
    setLoading(true);
    modelApi.getCrossSection({
      variable,
      lat1: crossSection.lat1,
      lon1: crossSection.lon1,
      lat2: crossSection.lat2,
      lon2: crossSection.lon2,
      time_index: timeIndex,
    })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [crossSection, variable, timeIndex]);

  if (!crossSection.enabled) return null;

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-xs" style={{ color: '#4b9cd3' }}>
        Loading cross-section...
      </div>
    );
  }

  if (!data) return null;

  const [nDist, nDepth] = data.shape;
  const cellWidth = 100 / nDist;
  const cellHeight = 100 / nDepth;

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase" style={{ color: '#4b9cd3' }}>
        Cross Section — {data.variable} ({data.unit})
      </div>
      <div className="text-[9px] mb-1" style={{ color: '#4b9cd3' }}>
        ({data.start_point[0].toFixed(1)}°N, {data.start_point[1].toFixed(1)}°E) →
        ({data.end_point[0].toFixed(1)}°N, {data.end_point[1].toFixed(1)}°E)
      </div>
      <div className="relative rounded-lg overflow-hidden" style={{
        border: '1px solid rgba(42, 108, 176, 0.2)',
        height: '200px',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Array.from({ length: nDist }).map((_, i) =>
            Array.from({ length: nDepth }).map((_, j) => {
              const idx = i * nDepth + j;
              const val = data.data[idx];
              const normalized = (val - colorbar.min) / (colorbar.max - colorbar.min);
              const color = getColormapCSS(normalized, colorbar.colormap, colorbar.reversed);
              return (
                <rect
                  key={`${i}-${j}`}
                  x={i * cellWidth}
                  y={j * cellHeight}
                  width={cellWidth + 0.5}
                  height={cellHeight + 0.5}
                  fill={color}
                />
              );
            })
          )}
        </svg>

        {/* Axis labels */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px]" style={{ color: '#7ec8e3' }}>
          Distance (km)
        </div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px]" style={{ color: '#7ec8e3' }}>
          Depth (m)
        </div>
      </div>
      <div className="flex justify-between mt-1 text-[9px] font-mono" style={{ color: '#4b9cd3' }}>
        <span>0 km</span>
        <span>{data.distances[data.distances.length - 1]?.toFixed(0)} km</span>
      </div>
    </div>
  );
}
