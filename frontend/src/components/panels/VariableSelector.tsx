// === Variable Selector ===
import { useOceanStore } from '../../stores/oceanStore';
import { VARIABLE_DEFAULTS } from '../../utils/colormaps';
import type { VariableType } from '../../types/ocean';

const KNOWN_VARIABLES: Record<string, { label: string; icon: string; color: string; category: string }> = {
  temperature: { label: 'Temperature', icon: '🌡️', color: '#ff6d00', category: 'Water Column' },
  thetao: { label: 'Potential Temp', icon: '🌡️', color: '#ff6d00', category: 'Water Column' },
  bottomT: { label: 'Bottom Temp', icon: '🌡️', color: '#ff8a50', category: 'Water Column' },
  salinity: { label: 'Salinity', icon: '🌊', color: '#00bfa5', category: 'Water Column' },
  so: { label: 'Salinity', icon: '🌊', color: '#00bfa5', category: 'Water Column' },
  currents: { label: 'Currents', icon: '🌀', color: '#0091ea', category: 'Velocities' },
  uo: { label: 'Zonal Vel', icon: '➡️', color: '#42a5f5', category: 'Velocities' },
  vo: { label: 'Meridional Vel', icon: '⬆️', color: '#42a5f5', category: 'Velocities' },
  zos: { label: 'Sea Surface Ht', icon: '🌊', color: '#26c6da', category: 'Sea Surface' },
  mlotst: { label: 'Mixed Layer', icon: '📏', color: '#ab47bc', category: 'Sea Surface' },
  sithick: { label: 'Ice Thickness', icon: '🧊', color: '#81d4fa', category: 'Sea Ice' },
  siconc: { label: 'Ice Fraction', icon: '❄️', color: '#b3e5fc', category: 'Sea Ice' },
  usi: { label: 'Ice X Vel', icon: '➡️', color: '#90caf9', category: 'Velocities' },
  vsi: { label: 'Ice Y Vel', icon: '⬆️', color: '#90caf9', category: 'Velocities' },
};

function getVariableConfig(id: string, displayName?: string) {
  if (KNOWN_VARIABLES[id]) return KNOWN_VARIABLES[id];
  return {
    label: displayName || id,
    icon: '📉',
    color: '#8e24aa',
    category: 'Other'
  };
}

export function VariableSelector() {
  const variable = useOceanStore((s) => s.variable);
  const setVariable = useOceanStore((s) => s.setVariable);
  const setColorbar = useOceanStore((s) => s.setColorbar);
  const vizMode = useOceanStore((s) => s.vizMode);
  const setVizMode = useOceanStore((s) => s.setVizMode);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);

  const defaultVars = [
    { name: 'temperature', display_name: 'Temperature', unit: '°C' },
    { name: 'salinity', display_name: 'Salinity', unit: 'PSU' },
    { name: 'currents', display_name: 'Currents', unit: 'm/s' }
  ];
  
  const activeVariables = datasetMeta?.variables || defaultVars;

  // Group variables
  const groupedVars: Record<string, typeof activeVariables> = {};
  activeVariables.forEach((v) => {
    const cat = getVariableConfig(v.name).category;
    if (!groupedVars[cat]) groupedVars[cat] = [];
    groupedVars[cat].push(v);
  });

  const handleSelect = (v: VariableType) => {
    setVariable(v);
    const defaults = VARIABLE_DEFAULTS[v];
    if (defaults) {
      setColorbar({ colormap: defaults.colormap, min: defaults.min, max: defaults.max });
    } else {
      const metaVar = activeVariables.find(av => av.name === v);
      if (metaVar) {
        setColorbar({ colormap: 'turbo', min: (metaVar as any).min_value || 0, max: (metaVar as any).max_value || 100 });
      }
    }
    const particleVars = ['currents', 'uo', 'vo', 'usi', 'vsi'];
    if (particleVars.includes(v)) {
      setVizMode('currents');
    } else if (vizMode === 'currents') {
      setVizMode('depth_slice');
    }
  };

  return (
    <div className="space-y-3">
      {Object.entries(groupedVars).map(([category, vars]) => (
        <div key={category}>
          <div className="text-[10px] font-semibold mb-1 uppercase tracking-wider opacity-60" style={{ color: '#4b9cd3' }}>
            {category}
          </div>
          <div className="space-y-1">
            {vars.map((v) => {
              const config = getVariableConfig(v.name, v.display_name);
              return (
                <button
                  key={v.name}
                  onClick={() => handleSelect(v.name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={variable === v.name ? {
                    background: `${config.color}15`,
                    border: `1px solid ${config.color}40`,
                    color: config.color,
                  } : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#7ec8e3',
                  }}
                >
                  <span>{config.icon}</span>
                  <span className="font-medium">{config.label}</span>
                  {variable === v.name && (
                    <span className="ml-auto text-[10px] font-mono opacity-80">
                      {v.unit || VARIABLE_DEFAULTS[v.name]?.unit || ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
