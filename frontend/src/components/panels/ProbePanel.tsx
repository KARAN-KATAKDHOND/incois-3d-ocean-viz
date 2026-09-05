// === Probe Panel ===
// Floating panel for the scientific probe tool.

import { useOceanStore } from '../../stores/oceanStore';

export function ProbePanel() {
  const probeData = useOceanStore((s) => s.probeData);
  const probeEnabled = useOceanStore((s) => s.probeEnabled);
  const setProbeEnabled = useOceanStore((s) => s.setProbeEnabled);
  const setProbeData = useOceanStore((s) => s.setProbeData);

  return (
    <div className="absolute top-4 left-4 z-10">
      {/* Probe toggle button */}
      <button
        onClick={() => {
          setProbeEnabled(!probeEnabled);
          if (probeEnabled) setProbeData(null);
        }}
        className={`sci-button text-xs ${probeEnabled ? 'animate-pulse-glow' : ''}`}
        style={probeEnabled ? {
          background: 'linear-gradient(135deg, #00838f, #00e5ff)',
          border: '1px solid rgba(0, 229, 255, 0.5)',
        } : {}}
      >
        📌 Probe {probeEnabled ? 'ON' : 'OFF'}
      </button>

      {/* Probe data display */}
      {probeData && (
        <div className="glass-panel-strong p-3 mt-2 animate-scale-in" style={{ width: '200px' }}>
          <div className="text-[10px] font-semibold mb-2 uppercase" style={{ color: '#7ec8e3' }}>
            Probe Data
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span style={{ color: '#4b9cd3' }}>Lat:</span>
              <span className="font-mono" style={{ color: '#e0f4fa' }}>{probeData.latitude.toFixed(2)}° N</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#4b9cd3' }}>Lon:</span>
              <span className="font-mono" style={{ color: '#e0f4fa' }}>{probeData.longitude.toFixed(2)}° E</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#4b9cd3' }}>Depth:</span>
              <span className="font-mono" style={{ color: '#e0f4fa' }}>{probeData.depth} m</span>
            </div>
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'rgba(42, 108, 176, 0.15)' }}>
              <span style={{ color: '#4b9cd3' }}>{probeData.variable}:</span>
              <span className="font-mono font-bold" style={{ color: '#00e5ff' }}>
                {probeData.value.toFixed(2)} {probeData.unit}
              </span>
            </div>
            <div className="text-[9px]" style={{ color: '#4b9cd3' }}>
              {probeData.time}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
