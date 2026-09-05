import { Waves, Map } from 'lucide-react';

export function MapLeftSidebar() {
  return (
    <div className="w-64 flex flex-col h-full z-10 animate-slide-left shadow-2xl"
      style={{
        background: 'rgba(10, 22, 40, 0.95)',
        borderRight: '1px solid rgba(42, 108, 176, 0.2)',
      }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ borderColor: 'rgba(42, 108, 176, 0.15)' }}>
        <Waves className="text-blue-500" size={24} />
        <span className="font-bold text-lg tracking-wide text-white">
          INCOIS <span className="text-blue-500">3D</span>
        </span>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Map size={16} /> Map Explorer
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Welcome to the 2D Global Overview. You are currently viewing historical autonomous instrument data overlaid on the global ocean model.
          </p>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-xl">
          <h3 className="text-xs font-bold text-blue-300 mb-2">Instructions</h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
            <li>Pan and zoom the globe using your mouse.</li>
            <li>Filter active observation platforms using the right panel.</li>
            <li><strong>Click a specific marker</strong> on the globe to launch the 4D Ocean Visualization focused on that exact data point.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
