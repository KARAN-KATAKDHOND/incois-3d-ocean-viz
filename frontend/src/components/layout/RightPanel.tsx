// === Right Panel ===
// Visualization controls: variable, mode, depth, colorbar, layers, exaggeration.

import { useOceanStore } from '../../stores/oceanStore';
import { VariableSelector } from '../panels/VariableSelector';
import { VisualizationModeSelector } from '../panels/VisualizationModeSelector';
import { DepthSlider } from '../panels/DepthSlider';
import { ColorbarEditor } from '../panels/ColorbarEditor';
import { LayerManager } from '../panels/LayerManager';
import { VerticalExaggeration } from '../panels/VerticalExaggeration';
import { IsosurfaceControls } from '../panels/IsosurfaceControls';

export function RightPanel() {
  const rightPanelOpen = useOceanStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useOceanStore((s) => s.setRightPanelOpen);
  const vizMode = useOceanStore((s) => s.vizMode);

  if (!rightPanelOpen) {
    return (
      <button
        onClick={() => setRightPanelOpen(true)}
        className="absolute right-2 top-14 z-10 w-8 h-8 flex items-center justify-center rounded-lg"
        style={{
          background: 'rgba(15, 32, 56, 0.85)',
          border: '1px solid rgba(42, 108, 176, 0.3)',
          color: '#7ec8e3',
        }}
        title="Open controls"
      >
        ⚙
      </button>
    );
  }

  return (
    <div className="w-64 overflow-y-auto animate-slide-right"
      style={{
        background: 'rgba(10, 22, 40, 0.95)',
        borderLeft: '1px solid rgba(42, 108, 176, 0.2)',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'rgba(42, 108, 176, 0.15)' }}>
        <span className="text-xs font-semibold" style={{ color: '#7ec8e3' }}>CONTROLS</span>
        <button onClick={() => setRightPanelOpen(false)} className="text-xs opacity-50 hover:opacity-100">
          ✕
        </button>
      </div>

      <div className="p-3 space-y-4">
        <VariableSelector />
        <VisualizationModeSelector />
        <DepthSlider />
        {vizMode === 'isosurface' && <IsosurfaceControls />}
        <ColorbarEditor />
        <LayerManager />
        <VerticalExaggeration />
      </div>
    </div>
  );
}
