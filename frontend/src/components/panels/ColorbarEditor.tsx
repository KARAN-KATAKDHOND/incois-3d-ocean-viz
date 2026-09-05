// === Colorbar Editor ===
import { useOceanStore } from '../../stores/oceanStore';
import { getColormapGradient } from '../../utils/colormaps';
import type { ColormapName } from '../../types/ocean';

const COLORMAPS: { id: ColormapName; label: string }[] = [
  { id: 'viridis', label: 'Viridis' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'inferno', label: 'Inferno' },
  { id: 'turbo', label: 'Turbo' },
  { id: 'coolwarm', label: 'Cool-Warm' },
  { id: 'ocean', label: 'Ocean' },
];

export function ColorbarEditor() {
  const colorbar = useOceanStore((s) => s.colorbar);
  const setColorbar = useOceanStore((s) => s.setColorbar);
  const variable = useOceanStore((s) => s.variable);

  const gradient = getColormapGradient(colorbar.colormap, colorbar.reversed);

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Colorbar
      </div>

      {/* Color gradient preview */}
      <div className="rounded-lg overflow-hidden mb-2" style={{ border: '1px solid rgba(42, 108, 176, 0.2)' }}>
        <div className="h-4 rounded" style={{ background: gradient }} />
        <div className="flex justify-between px-1 py-0.5 text-[10px] font-mono"
          style={{ color: '#7ec8e3', background: 'rgba(10, 22, 40, 0.8)' }}>
          <span>{colorbar.min}</span>
          <span>{variable === 'temperature' ? '°C' : variable === 'salinity' ? 'PSU' : variable === 'currents' ? 'm/s' : 'mg/m³'}</span>
          <span>{colorbar.max}</span>
        </div>
      </div>

      {/* Colormap selector */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        {COLORMAPS.map((cm) => (
          <button
            key={cm.id}
            onClick={() => setColorbar({ colormap: cm.id })}
            className="rounded-md overflow-hidden text-[9px] text-center pb-0.5 transition-all"
            style={colorbar.colormap === cm.id ? {
              border: '1px solid #00e5ff',
              boxShadow: '0 0 6px rgba(0, 229, 255, 0.2)',
            } : {
              border: '1px solid rgba(42, 108, 176, 0.15)',
            }}
          >
            <div className="h-2.5" style={{ background: getColormapGradient(cm.id) }} />
            <span style={{ color: colorbar.colormap === cm.id ? '#00e5ff' : '#4b9cd3' }}>
              {cm.label}
            </span>
          </button>
        ))}
      </div>

      {/* Min/Max inputs */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[9px] block mb-0.5" style={{ color: '#4b9cd3' }}>Min</label>
          <input
            type="number"
            value={colorbar.min}
            onChange={(e) => setColorbar({ min: parseFloat(e.target.value) || 0 })}
            className="sci-input w-full text-xs"
            step="0.1"
          />
        </div>
        <div>
          <label className="text-[9px] block mb-0.5" style={{ color: '#4b9cd3' }}>Max</label>
          <input
            type="number"
            value={colorbar.max}
            onChange={(e) => setColorbar({ max: parseFloat(e.target.value) || 100 })}
            className="sci-input w-full text-xs"
            step="0.1"
          />
        </div>
      </div>

      {/* Scale type & Reverse */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={`toggle-switch ${colorbar.scale === 'logarithmic' ? 'active' : ''}`}
            onClick={() => setColorbar({ scale: colorbar.scale === 'linear' ? 'logarithmic' : 'linear' })}
          />
          <span className="text-[10px]" style={{ color: '#7ec8e3' }}>Log</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`toggle-switch ${colorbar.reversed ? 'active' : ''}`}
            onClick={() => setColorbar({ reversed: !colorbar.reversed })}
          />
          <span className="text-[10px]" style={{ color: '#7ec8e3' }}>Reverse</span>
        </div>
      </div>
    </div>
  );
}
