// === Floating Legend ===
// Displays the active colorbar legend on the 3D viewport.

import { useOceanStore } from '../../stores/oceanStore';
import { getColormapGradient, VARIABLE_DEFAULTS } from '../../utils/colormaps';

export function FloatingLegend() {
  const variable = useOceanStore((s) => s.variable);
  const colorbar = useOceanStore((s) => s.colorbar);
  const depthIndex = useOceanStore((s) => s.depthIndex);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);
  const vizMode = useOceanStore((s) => s.vizMode);

  const defaults = VARIABLE_DEFAULTS[variable];
  const gradient = getColormapGradient(colorbar.colormap, colorbar.reversed);
  const depthLevels = datasetMeta?.depth_levels || [];
  const currentDepth = depthLevels[depthIndex] || 0;

  return (
    <div className="absolute bottom-16 left-4 z-10 glass-panel p-3 animate-fade-in" style={{ width: '200px' }}>
      {/* Variable name */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase" style={{ color: '#7ec8e3' }}>
          {defaults?.label || variable}
        </span>
        <span className="text-[9px] font-mono" style={{ color: '#4b9cd3' }}>
          {vizMode.replace('_', ' ')}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="h-3 rounded" style={{ background: gradient }} />

      {/* Min/Max labels */}
      <div className="flex justify-between mt-0.5 text-[10px] font-mono" style={{ color: '#7ec8e3' }}>
        <span>{colorbar.min}{defaults?.unit || ''}</span>
        <span>{colorbar.max}{defaults?.unit || ''}</span>
      </div>

      {/* Depth indicator */}
      <div className="mt-2 pt-1.5 border-t text-[10px]" style={{ borderColor: 'rgba(42, 108, 176, 0.15)', color: '#4b9cd3' }}>
        Depth: <span className="font-mono font-semibold" style={{ color: '#00e5ff' }}>{currentDepth} m</span>
      </div>

      {/* Scale type */}
      <div className="text-[9px] mt-0.5" style={{ color: '#4b9cd3' }}>
        Scale: {colorbar.scale} {colorbar.reversed ? '(reversed)' : ''}
      </div>
    </div>
  );
}
