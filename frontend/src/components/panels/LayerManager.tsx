// === Layer Manager ===
import { useOceanStore } from '../../stores/oceanStore';

const MODEL_LAYERS = [
  { id: 'temperature', label: 'Temperature', color: '#ff6d00' },
  { id: 'salinity', label: 'Salinity', color: '#aa00ff' },
  { id: 'currents', label: 'Currents', color: '#0091ea' }
];

const OBS_LAYERS = [
  { id: 'argo', label: 'Argo Floats', color: '#00e5ff' },
  { id: 'glider', label: 'Gliders', color: '#ffd600' },
  { id: 'ctd', label: 'CTD Stations', color: '#ff6d00' },
  { id: 'bgc', label: 'BGC Sensors', color: '#00c853' },
];

export function LayerManager() {
  const modelLayers = useOceanStore((s) => s.modelLayers);
  const obsLayers = useOceanStore((s) => s.obsLayers);
  const setModelLayer = useOceanStore((s) => s.setModelLayer);
  const setObsLayer = useOceanStore((s) => s.setObsLayer);

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Layers
      </div>

      {/* Model layers */}
      <div className="mb-2">
        <div className="text-[9px] font-semibold mb-1 uppercase" style={{ color: '#4b9cd3' }}>Model</div>
        {MODEL_LAYERS.map((layer) => {
          const state = modelLayers[layer.id];
          if (!state) return null;
          return (
            <div key={layer.id} className="flex items-center gap-2 py-1">
              <div
                className={`toggle-switch ${state.visible ? 'active' : ''}`}
                onClick={() => setModelLayer(layer.id, { visible: !state.visible })}
                style={state.visible ? {
                  background: `linear-gradient(135deg, ${layer.color}80, ${layer.color})`,
                } : {}}
              />
              <span className="text-[11px] flex-1" style={{ color: state.visible ? '#e0f4fa' : '#4b9cd3' }}>
                {layer.label}
              </span>
              {state.visible && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={state.opacity * 100}
                  onChange={(e) => setModelLayer(layer.id, { opacity: parseInt(e.target.value) / 100 })}
                  className="w-16"
                  title={`Opacity: ${Math.round(state.opacity * 100)}%`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Observation layers */}
      <div>
        <div className="text-[9px] font-semibold mb-1 uppercase" style={{ color: '#4b9cd3' }}>Observations</div>
        {OBS_LAYERS.map((layer) => {
          const state = obsLayers[layer.id];
          if (!state) return null;
          return (
            <div key={layer.id} className="flex items-center gap-2 py-1">
              <div
                className={`toggle-switch ${state.visible ? 'active' : ''}`}
                onClick={() => setObsLayer(layer.id, { visible: !state.visible })}
                style={state.visible ? {
                  background: `linear-gradient(135deg, ${layer.color}80, ${layer.color})`,
                } : {}}
              />
              <span className="text-[11px] flex-1" style={{ color: state.visible ? '#e0f4fa' : '#4b9cd3' }}>
                {layer.label}
              </span>
              {state.visible && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={state.opacity * 100}
                  onChange={(e) => setObsLayer(layer.id, { opacity: parseInt(e.target.value) / 100 })}
                  className="w-16"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
