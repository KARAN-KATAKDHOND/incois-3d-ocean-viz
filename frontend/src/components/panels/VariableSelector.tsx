// === Variable Selector ===
import { useOceanStore } from '../../stores/oceanStore';
import { VARIABLE_DEFAULTS } from '../../utils/colormaps';
import type { VariableType } from '../../types/ocean';

const VARIABLES: { id: VariableType; label: string; icon: string; color: string }[] = [
  { id: 'temperature', label: 'Temperature', icon: '🌡️', color: '#ff6d00' },
  { id: 'salinity', label: 'Salinity', icon: '🌊', color: '#00bfa5' },
  { id: 'currents', label: 'Currents', icon: '🌀', color: '#0091ea' },
];

export function VariableSelector() {
  const variable = useOceanStore((s) => s.variable);
  const setVariable = useOceanStore((s) => s.setVariable);
  const setColorbar = useOceanStore((s) => s.setColorbar);
  const vizMode = useOceanStore((s) => s.vizMode);
  const setVizMode = useOceanStore((s) => s.setVizMode);

  const handleSelect = (v: VariableType) => {
    setVariable(v);
    const defaults = VARIABLE_DEFAULTS[v];
    if (defaults) {
      setColorbar({ colormap: defaults.colormap, min: defaults.min, max: defaults.max });
    }
    if (v === 'currents') {
      setVizMode('currents');
    } else if (vizMode === 'currents') {
      setVizMode('depth_slice');
    }
  };

  return (
    <div>
      <div className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#4b9cd3' }}>
        Variable
      </div>
      <div className="space-y-1">
        {VARIABLES.map((v) => (
          <button
            key={v.id}
            onClick={() => handleSelect(v.id)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={variable === v.id ? {
              background: `${v.color}15`,
              border: `1px solid ${v.color}40`,
              color: v.color,
            } : {
              background: 'transparent',
              border: '1px solid transparent',
              color: '#7ec8e3',
            }}
          >
            <span>{v.icon}</span>
            <span className="font-medium">{v.label}</span>
            {variable === v.id && (
              <span className="ml-auto text-[10px] font-mono" style={{ color: '#4b9cd3' }}>
                {VARIABLE_DEFAULTS[v.id]?.unit}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
