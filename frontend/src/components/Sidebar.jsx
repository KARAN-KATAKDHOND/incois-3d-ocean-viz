import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../store/useMapStore';
import { Layers, Activity, Settings, X, Droplet, Wind, LogOut, User, SlidersHorizontal , Moon , Sun } from 'lucide-react';

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Zustand State
  const { activeLayers, toggleLayer, layerOpacity, setLayerOpacity, verticalExaggeration, setVerticalExaggeration } = useMapStore();
const { theme, toggleTheme } = useMapStore();
  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
        {/* Ocean Models */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
            <Layers size={14} /> Ocean Models
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input 
                type="checkbox" 
                checked={activeLayers.sst}
                onChange={() => toggleLayer('sst')}
                className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-blue-500" 
              />
              <Droplet size={16} className="text-blue-400" />
              <span className="text-sm font-medium">Sea Surface Temperature</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input 
                type="checkbox" 
                checked={activeLayers.salinity}
                onChange={() => toggleLayer('salinity')}
                className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500" 
              />
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
              <input 
                type="checkbox"
                checked={activeLayers.argo}
                onChange={() => toggleLayer('argo')}
                className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-emerald-500" 
              />
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-sm font-medium">Argo Floats</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
              <input 
                type="checkbox"
                checked={activeLayers.gliders}
                onChange={() => toggleLayer('gliders')}
                className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-purple-500" 
              />
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="text-sm font-medium">Underwater Gliders</span>
            </label>
          </div>
        </section>

        {/* 3D Visual Controls */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
            <SlidersHorizontal size={14} /> Visual Settings
          </h2>
          <div className="space-y-5 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Model Opacity</span>
                <span>{Math.round(layerOpacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer" 
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Depth Exaggeration (3D)</span>
                <span>{verticalExaggeration.toFixed(1)}x</span>
              </div>
              <input 
                type="range" 
                min="1" max="10" step="0.5"
                value={verticalExaggeration}
                onChange={(e) => setVerticalExaggeration(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer" 
              />
            </div>
          </div>
        </section>
      </div>

      {/* Profile & Session Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
        {user && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-slate-200">{user.name}</p>
              <p className="text-[10px] text-blue-400 font-mono truncate">{user.role}</p>
            </div>
          </div>
        )}
        {/* <button 
  onClick={toggleTheme}
  className="flex justify-center items-center p-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
>
  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
</button> */}
        <button
          onClick={handleLogout}
          className="flex w-full justify-center items-center gap-2 py-2 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
        >
          <LogOut size={14} /> Terminate Session
        </button>
      </div>
    </aside>
  );
}