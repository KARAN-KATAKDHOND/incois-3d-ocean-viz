import { useState, useEffect } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import { observationApi, comparisonApi } from '../../services/api';
import { ComparisonChart } from '../../charts/ComparisonChart';
import type { Observation, ComparisonData, VariableType } from '../../types/ocean';

const QUALITY_COLORS: Record<string, string> = {
  valid: '#00c853',
  suspect: '#ffd600',
  missing: '#ff5252',
  interpolated: '#7c4dff',
};

export function ComparePanel() {
  const activePage = useOceanStore((s) => s.activePage);
  const selectedObservation = useOceanStore((s) => s.selectedObservation);
  const setSelectedObservation = useOceanStore((s) => s.setSelectedObservation);
  
  const [observations, setObservations] = useState<Observation[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [profileVariable, setProfileVariable] = useState<VariableType>('temperature');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch observations list when panel opens
  useEffect(() => {
    if (activePage !== 'compare') return;
    
    setLoadingList(true);
    observationApi.list({})
      .then(setObservations)
      .catch((err) => {
        console.error('Failed to fetch observations:', err);
        setError('Failed to load observations.');
      })
      .finally(() => setLoadingList(false));
  }, [activePage]);

  // Fetch comparison data when an observation is selected
  useEffect(() => {
    if (activePage !== 'compare' || !selectedObservation) {
      setComparisonData(null);
      return;
    }

    setLoadingCompare(true);
    comparisonApi.compare({
      observation_id: selectedObservation.id,
      variable: profileVariable,
    })
      .then(setComparisonData)
      .catch((err) => {
        console.error('Failed to fetch comparison:', err);
        setComparisonData(null);
      })
      .finally(() => setLoadingCompare(false));
  }, [selectedObservation, profileVariable, activePage]);

  if (activePage !== 'compare') return null;

  return (
    <div 
      className="absolute top-4 left-64 z-20 w-[450px] max-h-[80vh] flex flex-col rounded-xl shadow-2xl animate-fade-in"
      style={{
        background: 'rgba(10, 22, 40, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(42, 108, 176, 0.3)',
      }}
    >
      <div className="shrink-0 px-4 py-3 border-b z-10 flex items-center justify-between"
           style={{ 
             background: 'rgba(10, 22, 40, 0.95)',
             borderColor: 'rgba(42, 108, 176, 0.2)' 
           }}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#00e5ff' }}>
          <span>📊</span> Model Validation
        </h2>
        {selectedObservation && (
          <button 
            className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 transition"
            onClick={() => setSelectedObservation(null)}
          >
            Back to List
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {error && (
          <div className="text-xs text-red-400 p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
            {error}
          </div>
        )}

        {!selectedObservation ? (
          // List View
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">Select an instrument to compare its recorded profile against the model's prediction.</p>
            {loadingList ? (
              <div className="text-xs text-center py-6 opacity-60 flex flex-col items-center gap-2" style={{ color: '#7ec8e3' }}>
                <span className="animate-spin text-lg">⚙️</span>
                Loading observation network...
              </div>
            ) : (
              observations.map((obs) => (
                <div 
                  key={obs.id}
                  className="p-3 rounded-lg border bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60 hover:border-blue-400/30 transition-all cursor-pointer"
                  onClick={() => setSelectedObservation(obs)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-sm text-slate-200 flex items-center gap-2">
                      <span>{obs.instrument_type === 'argo' ? '🔵' :
                             obs.instrument_type === 'glider' ? '🟡' :
                             obs.instrument_type === 'ctd' ? '🟠' : '🟢'}</span>
                      {obs.id}
                    </div>
                    <span className="text-[9px] uppercase font-semibold" style={{ color: QUALITY_COLORS[obs.quality] || '#7ec8e3' }}>
                      {obs.quality}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono mt-2">
                    <div>Lat: {obs.latitude.toFixed(2)}</div>
                    <div>Lon: {obs.longitude.toFixed(2)}</div>
                    <div>Depth: {obs.depth}m</div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Variables: {obs.variables.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Comparison View
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/20">
              <h3 className="font-medium text-sm text-blue-100 mb-1">{selectedObservation.id}</h3>
              <p className="text-xs text-blue-300/70">{selectedObservation.data_source}</p>
            </div>

            {/* Variable tabs */}
            <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg">
              {(['temperature', 'salinity'] as VariableType[])
                .filter((v) => selectedObservation.variables.includes(v))
                .map((v) => (
                  <button
                    key={v}
                    className={`flex-1 text-xs py-1.5 rounded transition ${
                      profileVariable === v 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    onClick={() => setProfileVariable(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
            </div>

            <div className="min-h-[300px] flex items-center justify-center">
              {loadingCompare ? (
                <div className="text-xs text-center opacity-60 flex flex-col items-center gap-2" style={{ color: '#7ec8e3' }}>
                  <span className="animate-spin text-lg">⚙️</span>
                  Computing metrics...
                </div>
              ) : comparisonData ? (
                <div className="w-full">
                  <ComparisonChart data={comparisonData} />
                </div>
              ) : (
                <div className="text-xs text-slate-500">Failed to load comparison data.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
