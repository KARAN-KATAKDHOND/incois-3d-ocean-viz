// === Depth Slider ===
import { useOceanStore } from '../../stores/oceanStore';

export function DepthSlider() {
  const depthIndex = useOceanStore((s) => s.depthIndex);
  const setDepthIndex = useOceanStore((s) => s.setDepthIndex);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);

  const depthLevels = datasetMeta?.depth_levels || [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
  const maxIndex = depthLevels.length - 1;
  const currentDepth = depthLevels[depthIndex] || 0;

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Depth
      </div>

      {/* Current depth display */}
      <div className="text-center mb-2 py-1.5 rounded-lg"
        style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
        <span className="text-lg font-mono font-bold" style={{ color: '#00e5ff' }}>
          {currentDepth}
        </span>
        <span className="text-xs ml-1" style={{ color: '#4b9cd3' }}>m</span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={maxIndex}
        value={depthIndex}
        onChange={(e) => setDepthIndex(parseInt(e.target.value))}
        className="w-full"
      />

      {/* Depth scale */}
      <div className="flex justify-between mt-1 text-[9px]" style={{ color: '#4b9cd3' }}>
        <span>Surface</span>
        <span>{depthLevels[maxIndex]}m</span>
      </div>

      {/* Quick depth buttons */}
      <div className="flex flex-wrap gap-1 mt-2">
        {[0, 3, 5, 7, 9, 11, 13].map((idx) => {
          if (idx > maxIndex) return null;
          return (
            <button
              key={idx}
              onClick={() => setDepthIndex(idx)}
              className="px-2 py-0.5 rounded text-[10px] font-mono transition-all"
              style={depthIndex === idx ? {
                background: 'rgba(0, 229, 255, 0.2)',
                color: '#00e5ff',
                border: '1px solid rgba(0, 229, 255, 0.3)',
              } : {
                background: 'rgba(15, 32, 56, 0.5)',
                color: '#4b9cd3',
                border: '1px solid rgba(42, 108, 176, 0.15)',
              }}
            >
              {depthLevels[idx]}m
            </button>
          );
        })}
      </div>
    </div>
  );
}
