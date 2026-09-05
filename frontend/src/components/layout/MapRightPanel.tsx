import { useOceanStore } from '../../stores/oceanStore';
import type { InstrumentType } from '../../types/ocean';

const INSTRUMENT_TYPES: { id: InstrumentType; label: string; color: string }[] = [
  { id: 'argo', label: 'Argo Floats', color: '#00e5ff' },
  { id: 'glider', label: 'Gliders', color: '#ff0055' },
  { id: 'ctd', label: 'CTD Casts', color: '#00ff00' },
  { id: 'bgc', label: 'BGC Argo', color: '#ffd700' },
];

export function MapRightPanel() {
  const obsLayers = useOceanStore((s) => s.obsLayers);
  const setObsLayer = useOceanStore((s) => s.setObsLayer);

  return (
    <div className="w-64 flex flex-col h-full z-10 animate-slide-right shadow-2xl"
      style={{
        background: 'rgba(10, 22, 40, 0.95)',
        borderLeft: '1px solid rgba(42, 108, 176, 0.2)',
      }}>
      
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b"
        style={{ borderColor: 'rgba(42, 108, 176, 0.15)' }}>
        <span className="text-xs font-semibold" style={{ color: '#7ec8e3' }}>MAP FILTERS</span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* Observations Filter */}
        <div>
          <div className="text-[10px] font-semibold mb-3 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
            Observation Platforms
          </div>
          <div className="space-y-2">
            {INSTRUMENT_TYPES.map((inst) => {
              const isActive = obsLayers[inst.id]?.visible;
              return (
                <button
                  key={inst.id}
                  onClick={() => setObsLayer(inst.id, { visible: !isActive })}
                  className="w-full flex items-center justify-between p-2 rounded border transition-all text-left"
                  style={{
                    background: isActive ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isActive ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shadow-lg"
                      style={{
                        background: inst.color,
                        opacity: isActive ? 1 : 0.2,
                        boxShadow: isActive ? `0 0 8px ${inst.color}` : 'none',
                      }}
                    />
                    <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {inst.label}
                    </span>
                  </div>
                  <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                    isActive ? 'bg-blue-500' : 'bg-slate-700'
                  }`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
