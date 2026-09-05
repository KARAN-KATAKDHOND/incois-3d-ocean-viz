// === Isosurface Controls ===
import { useOceanStore } from '../../stores/oceanStore';
import { VARIABLE_DEFAULTS } from '../../utils/colormaps';

export function IsosurfaceControls() {
  const isoThreshold = useOceanStore((s) => s.isoThreshold);
  const isoEnabled = useOceanStore((s) => s.isoEnabled);
  const setIsoThreshold = useOceanStore((s) => s.setIsoThreshold);
  const setIsoEnabled = useOceanStore((s) => s.setIsoEnabled);
  const variable = useOceanStore((s) => s.variable);

  const defaults = VARIABLE_DEFAULTS[variable];
  const min = defaults?.min || 0;
  const max = defaults?.max || 100;
  const unit = defaults?.unit || '';

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Isosurface
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div
          className={`toggle-switch ${isoEnabled ? 'active' : ''}`}
          onClick={() => setIsoEnabled(!isoEnabled)}
        />
        <span className="text-[11px]" style={{ color: isoEnabled ? '#e0f4fa' : '#4b9cd3' }}>
          {isoEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {isoEnabled && (
        <>
          <div className="text-center mb-1 py-1 rounded-lg"
            style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
            <span className="text-sm font-mono font-bold" style={{ color: '#00e5ff' }}>
              {isoThreshold.toFixed(1)}
            </span>
            <span className="text-[10px] ml-1" style={{ color: '#4b9cd3' }}>{unit}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={0.1}
            value={isoThreshold}
            onChange={(e) => setIsoThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between mt-0.5 text-[9px]" style={{ color: '#4b9cd3' }}>
            <span>{min} {unit}</span>
            <span>{max} {unit}</span>
          </div>
        </>
      )}
    </div>
  );
}
