// === Vertical Exaggeration ===
import { useOceanStore } from '../../stores/oceanStore';

const PRESETS = [1, 2, 5, 10, 20];

export function VerticalExaggeration() {
  const ve = useOceanStore((s) => s.verticalExaggeration);
  const setVE = useOceanStore((s) => s.setVerticalExaggeration);

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Vertical Exaggeration
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg font-mono font-bold" style={{ color: '#00e5ff' }}>{ve}×</span>
      </div>
      <input
        type="range"
        min={1}
        max={20}
        value={ve}
        onChange={(e) => setVE(parseInt(e.target.value))}
        className="w-full"
      />
      <div className="flex gap-1 mt-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setVE(p)}
            className="flex-1 py-0.5 rounded text-[10px] font-mono transition-all"
            style={ve === p ? {
              background: 'rgba(0, 229, 255, 0.2)',
              color: '#00e5ff',
              border: '1px solid rgba(0, 229, 255, 0.3)',
            } : {
              background: 'rgba(15, 32, 56, 0.5)',
              color: '#4b9cd3',
              border: '1px solid rgba(42, 108, 176, 0.15)',
            }}
          >
            {p}×
          </button>
        ))}
      </div>
    </div>
  );
}
