import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../store/useMapStore';
import { 
  Layers, Activity, Settings, X, Droplet, Wind, LogOut, User, 
  SlidersHorizontal, Moon, Sun, Database, ChevronDown, RefreshCw 
} from 'lucide-react';

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Zustand State
  const { 
    activeLayers, toggleLayer, layerOpacity, setLayerOpacity, 
    verticalExaggeration, setVerticalExaggeration,
    theme, toggleTheme,
    // API-driven state
    availableDatasets, activeDatasetId, setActiveDataset,
    activeVariable, setActiveVariable,
    activeDepthIdx, setActiveDepthIdx,
    activeTimeIdx, setActiveTimeIdx,
    datasetMetadata,
    fetchDatasets, fetchSlice, fetchInsituPoints,
    isLoadingDatasets, isLoadingSlice,
    profileData,
  } = useMapStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fetch slice when dataset/variable/depth/time changes
  useEffect(() => {
    if (activeDatasetId) {
      fetchSlice();
    }
  }, [activeDatasetId, activeVariable, activeDepthIdx, activeTimeIdx]);

  const griddedDatasets = availableDatasets.filter(d => d.type === 'gridded');
  const insituDatasets = availableDatasets.filter(d => d.type === 'insitu');

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

        {/* ─── Dataset Selector ─────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
            <Database size={14} /> Dataset
            <button 
              onClick={fetchDatasets} 
              className="ml-auto p-1 text-slate-500 hover:text-blue-400 transition-colors"
              title="Refresh datasets"
            >
              <RefreshCw size={12} className={isLoadingDatasets ? 'animate-spin' : ''} />
            </button>
          </h2>
          <div className="space-y-3">
            {/* Gridded datasets */}
            {griddedDatasets.length > 0 ? (
              <div className="relative">
                <select
                  value={activeDatasetId || ''}
                  onChange={(e) => setActiveDataset(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a gridded dataset...</option>
                  {griddedDatasets.map((d) => (
                    <option key={d.dataset_id} value={d.dataset_id}>
                      {d.name} ({d.variables?.join(', ')})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                {isLoadingDatasets ? 'Loading datasets...' : 'No datasets available. Upload data to get started.'}
              </div>
            )}

            {/* In-situ datasets */}
            {insituDatasets.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">In-Situ</span>
                {insituDatasets.map((d) => (
                  <button
                    key={d.dataset_id}
                    onClick={() => fetchInsituPoints(d.dataset_id)}
                    className="w-full text-left px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                  >
                    📍 {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Variable & Depth Controls (only when dataset selected) ── */}
        {datasetMetadata && (
          <section>
            <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
              <SlidersHorizontal size={14} /> Data Selection
            </h2>
            <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-800">
              
              {/* Variable picker */}
              {datasetMetadata.variables?.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">Variable</div>
                  <div className="flex flex-wrap gap-2">
                    {datasetMetadata.variables.map((v) => (
                      <button
                        key={v}
                        onClick={() => setActiveVariable(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeVariable === v
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Depth level slider */}
              {datasetMetadata.depth_levels?.length > 1 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Depth Level</span>
                    <span className="font-mono text-blue-400">
                      {datasetMetadata.depth_levels[activeDepthIdx]?.toFixed(0) ?? 0}m
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={datasetMetadata.depth_levels.length - 1} 
                    step="1"
                    value={activeDepthIdx}
                    onChange={(e) => setActiveDepthIdx(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Surface (0m)</span>
                    <span>{datasetMetadata.depth_levels[datasetMetadata.depth_levels.length - 1]?.toFixed(0)}m</span>
                  </div>
                </div>
              )}

              {/* Time step (if dataset has time) */}
              {datasetMetadata.time_steps > 1 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Time Step</span>
                    <span className="font-mono text-blue-400">{activeTimeIdx} / {datasetMetadata.time_steps - 1}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={datasetMetadata.time_steps - 1} 
                    step="1"
                    value={activeTimeIdx}
                    onChange={(e) => setActiveTimeIdx(parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer" 
                  />
                </div>
              )}

              {isLoadingSlice && (
                <div className="text-[10px] text-blue-400 flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" /> Fetching slice...
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Depth Profile Display ───────────────────────────── */}
        {profileData && (
          <section>
            <h2 className="text-xs uppercase tracking-widest font-semibold text-slate-500 flex items-center gap-2 mb-4">
              <Activity size={14} /> Depth Profile
            </h2>
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[10px] text-slate-400">
                📍 {profileData.lat?.toFixed(2)}°N, {profileData.lon?.toFixed(2)}°E — {profileData.variable}
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                {profileData.depths?.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5 border-b border-slate-800/50">
                    <span className="text-slate-500 font-mono">{d?.toFixed(0)}m</span>
                    <span className="text-slate-200 font-mono">
                      {profileData.values?.[i] !== null ? profileData.values[i]?.toFixed(2) : '—'}
                      <span className="text-slate-500 ml-1">{profileData.units}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Ocean Models (Layer Toggles) ────────────────────── */}
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

        {/* ─── Instruments ─────────────────────────────────────── */}
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

        {/* ─── 3D Visual Controls ──────────────────────────────── */}
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

      {/* ─── Profile & Session Footer ──────────────────────────── */}
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