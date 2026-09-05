// === Visualization Mode Selector ===
import { useOceanStore } from '../../stores/oceanStore';
import type { VisualizationMode } from '../../types/ocean';

const MODES: { id: VisualizationMode; label: string }[] = [
  { id: 'volume', label: 'Volume' },
  { id: 'depth_slice', label: 'Depth Slice' },
  { id: 'isosurface', label: 'Isosurface' },
  { id: 'currents', label: 'Currents' },
];

export function VisualizationModeSelector() {
  const vizMode = useOceanStore((s) => s.vizMode);
  const setVizMode = useOceanStore((s) => s.setVizMode);
  const setIsoEnabled = useOceanStore((s) => s.setIsoEnabled);

  const handleMode = (mode: VisualizationMode) => {
    setVizMode(mode);
    if (mode === 'isosurface') {
      setIsoEnabled(true);
    }
  };

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Visualization Mode
      </div>
      <div className="tab-group">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`tab-item flex-1 text-center ${vizMode === m.id ? 'active' : ''}`}
            onClick={() => handleMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
