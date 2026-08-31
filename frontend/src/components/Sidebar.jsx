import { Layers, Activity, Settings, X, Droplet, Wind } from 'lucide-react';

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-full h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl">
      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Data <span className="text-blue-500">Controls</span></h1>
          <p className="text-xs text-slate-400 mt-1">Operational Workspace</p>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {/* Model Fields */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
            <Layers size={14} /> Ocean Models
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" />
              <Droplet size={16} className="text-blue-400" />
              <span className="text-sm font-medium">Sea Surface Temperature</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
              <Wind size={16} className="text-cyan-400" />
              <span className="text-sm font-medium">Salinity</span>
            </label>
          </div>
        </section>

        {/* Instruments */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
            <Activity size={14} /> Instruments
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-sm font-medium">Argo Floats</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900" />
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="text-sm font-medium">Underwater Gliders</span>
            </label>
          </div>
        </section>
      </div>

      <div className="p-5 border-t border-slate-800 bg-slate-900/50">
        <button className="flex w-full justify-center items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
          <Settings size={16} /> Configuration
        </button>
      </div>
    </aside>
  );
}