// === Cross-Section Panel ===
// Dedicated panel for cross-section configuration and visualization.

import { useOceanStore } from '../../stores/oceanStore';
import { CrossSectionChart } from '../../charts/CrossSectionChart';

export function CrossSectionPanel() {
  const crossSection = useOceanStore((s) => s.crossSection);
  const setCrossSection = useOceanStore((s) => s.setCrossSection);
  const setActivePage = useOceanStore((s) => s.setActivePage);
  const activePage = useOceanStore((s) => s.activePage);

  if (activePage !== 'crosssection') return null;

  const PRESETS = [
    { label: 'Arabian Sea', lat1: 15, lon1: 60, lat2: 15, lon2: 70 },
    { label: 'Bay of Bengal', lat1: 15, lon1: 85, lat2: 15, lon2: 95 },
    { label: 'Equatorial', lat1: 0, lon1: 50, lat2: 0, lon2: 90 },
  ];

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setCrossSection({
      lat1: preset.lat1,
      lon1: preset.lon1,
      lat2: preset.lat2,
      lon2: preset.lon2,
      enabled: true
    });
  };

  return (
    <div 
      className="absolute top-4 left-64 z-20 w-[600px] h-[550px] flex flex-col rounded-xl shadow-2xl animate-fade-in overflow-hidden"
      style={{
        background: 'rgba(10, 22, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(42, 108, 176, 0.3)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b z-10 flex items-center justify-between"
           style={{ 
             background: 'rgba(10, 22, 40, 0.95)',
             borderColor: 'rgba(42, 108, 176, 0.2)' 
           }}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#00e5ff' }}>
          <span>📐</span> Vertical Cross-Section
        </h2>
        <button
          onClick={() => { setActivePage('explorer'); setCrossSection({ enabled: false }); }}
          className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 transition"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col">
        {/* Presets */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold mb-2 uppercase" style={{ color: '#4b9cd3' }}>
            Quick Presets
          </div>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className="flex-1 py-1.5 px-2 bg-blue-900/30 hover:bg-blue-600 text-xs rounded border border-blue-500/30 transition-colors"
                style={{ color: '#e0f4fa' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

      {/* Configuration */}
      <div className="flex gap-4 mb-4">
        <div className="glass-panel p-3 flex-1">
          <div className="text-[10px] font-semibold mb-2 uppercase" style={{ color: '#4b9cd3' }}>
            Start Point
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block" style={{ color: '#4b9cd3' }}>Lat</label>
              <input
                type="number"
                value={crossSection.lat1}
                onChange={(e) => setCrossSection({ lat1: parseFloat(e.target.value) })}
                className="sci-input w-full text-xs"
                step="0.5"
              />
            </div>
            <div>
              <label className="text-[9px] block" style={{ color: '#4b9cd3' }}>Lon</label>
              <input
                type="number"
                value={crossSection.lon1}
                onChange={(e) => setCrossSection({ lon1: parseFloat(e.target.value) })}
                className="sci-input w-full text-xs"
                step="0.5"
              />
            </div>
          </div>
        </div>
        <div className="glass-panel p-3 flex-1">
          <div className="text-[10px] font-semibold mb-2 uppercase" style={{ color: '#4b9cd3' }}>
            End Point
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block" style={{ color: '#4b9cd3' }}>Lat</label>
              <input
                type="number"
                value={crossSection.lat2}
                onChange={(e) => setCrossSection({ lat2: parseFloat(e.target.value) })}
                className="sci-input w-full text-xs"
                step="0.5"
              />
            </div>
            <div>
              <label className="text-[9px] block" style={{ color: '#4b9cd3' }}>Lon</label>
              <input
                type="number"
                value={crossSection.lon2}
                onChange={(e) => setCrossSection({ lon2: parseFloat(e.target.value) })}
                className="sci-input w-full text-xs"
                step="0.5"
              />
            </div>
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setCrossSection({ enabled: true })}
            className="sci-button-primary sci-button"
          >
            Generate Section
          </button>
        </div>
      </div>

      {/* Cross-section chart */}
      <div className="flex-1 rounded-lg border flex flex-col min-h-0 relative" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(42, 108, 176, 0.2)' }}>
        {crossSection.enabled ? (
          <div className="absolute inset-0 p-2">
            <CrossSectionChart />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-xs" style={{ color: '#4b9cd3' }}>
            <span className="text-2xl mb-2 opacity-50">📐</span>
            Click a preset above or manually generate a section
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
