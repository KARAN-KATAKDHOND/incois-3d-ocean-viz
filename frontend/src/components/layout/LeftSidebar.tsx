// === Left Sidebar ===
// Navigation sidebar with section links and dataset overview.

import { useOceanStore } from '../../stores/oceanStore';

const NAV_ITEMS = [
  { id: 'explorer', label: '3D Ocean', icon: '🌊' },
  { id: 'observations', label: 'Observations', icon: '📍' },
  { id: 'compare', label: 'Compare', icon: '📊' },
  { id: 'crosssection', label: 'Cross Section', icon: '📐' },
  { id: 'datasets', label: 'Datasets', icon: '💾' },
];

export function LeftSidebar() {
  const activePage = useOceanStore((s) => s.activePage);
  const setActivePage = useOceanStore((s) => s.setActivePage);
  const leftSidebarOpen = useOceanStore((s) => s.leftSidebarOpen);
  const setLeftSidebarOpen = useOceanStore((s) => s.setLeftSidebarOpen);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);

  if (!leftSidebarOpen) {
    return (
      <div className="w-10 flex flex-col items-center pt-3"
        style={{ background: 'rgba(10, 22, 40, 0.95)', borderRight: '1px solid rgba(42, 108, 176, 0.2)' }}>
        <button onClick={() => setLeftSidebarOpen(true)} className="text-lg hover:opacity-80" title="Open sidebar">
          ☰
        </button>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg mt-2 text-sm transition-all
              ${activePage === item.id ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
            style={activePage === item.id ? {
              background: 'rgba(0, 229, 255, 0.15)',
              boxShadow: '0 0 8px rgba(0, 229, 255, 0.1)',
            } : {}}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-52 flex flex-col overflow-y-auto animate-slide-left"
      style={{
        background: 'rgba(10, 22, 40, 0.95)',
        borderRight: '1px solid rgba(42, 108, 176, 0.2)',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'rgba(42, 108, 176, 0.15)' }}>
        <span className="text-xs font-semibold" style={{ color: '#7ec8e3' }}>NAVIGATION</span>
        <button onClick={() => setLeftSidebarOpen(false)} className="text-xs opacity-50 hover:opacity-100">
          ✕
        </button>
      </div>

      {/* Nav items */}
      <div className="p-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activePage === item.id ? '' : 'hover:opacity-80'
            }`}
            style={activePage === item.id ? {
              background: 'rgba(0, 229, 255, 0.12)',
              color: '#00e5ff',
              borderLeft: '2px solid #00e5ff',
            } : {
              color: '#7ec8e3',
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Dataset overview */}
      {datasetMeta && (
        <div className="mt-auto p-3 border-t" style={{ borderColor: 'rgba(42, 108, 176, 0.15)' }}>
          <div className="text-[10px] font-semibold mb-2" style={{ color: '#4b9cd3' }}>
            ACTIVE DATASET
          </div>
          <div className="text-xs font-medium" style={{ color: '#e0f4fa' }}>
            {datasetMeta.name.replace(' — DEMO', '')}
          </div>
          <div className="text-[10px] mt-1 space-y-0.5" style={{ color: '#4b9cd3' }}>
            <div>{datasetMeta.variables.length} variables</div>
            <div>{datasetMeta.time_steps.length} time steps</div>
            <div>{datasetMeta.depth_levels.length} depth levels</div>
            <div>
              {datasetMeta.spatial_extent.lat_min}°–{datasetMeta.spatial_extent.lat_max}°N
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
