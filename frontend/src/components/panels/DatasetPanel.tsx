import { useEffect, useState } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import { datasetApi } from '../../services/api';
import type { DatasetListItem } from '../../types/ocean';

export function DatasetPanel() {
  const activePage = useOceanStore((s) => s.activePage);
  const datasetId = useOceanStore((s) => s.datasetId);
  const setDatasetId = useOceanStore((s) => s.setDatasetId);
  const setLoading = useOceanStore((s) => s.setLoading);
  const setDatasetMeta = useOceanStore((s) => s.setDatasetMeta);

  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activePage !== 'datasets') return;

    datasetApi.list()
      .then(setDatasets)
      .catch((err) => {
        console.error('Failed to fetch datasets:', err);
        setError('Failed to load datasets.');
      });
  }, [activePage]);

  const handleSelectDataset = async (id: string) => {
    if (id === datasetId) return;
    
    setLoading(true, 'Loading dataset metadata...');
    try {
      const meta = await datasetApi.get(id);
      setDatasetMeta(meta);
      setDatasetId(id);
    } catch (err) {
      console.error('Failed to load dataset details:', err);
      setError('Failed to load dataset metadata.');
    } finally {
      setLoading(false);
    }
  };

  if (activePage !== 'datasets') return null;

  return (
    <div className="absolute top-4 left-64 z-20 w-96 max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl animate-fade-in custom-scrollbar bg-[#0a1628]/85 backdrop-blur-xl border border-[#2a6cb0]/30">
      <div className="sticky top-0 px-4 py-3 border-b border-[#2a6cb0]/20 z-10 flex items-center justify-between bg-[#0a1628]/95">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-[#00e5ff]">
          <span>💾</span> Available Datasets
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {error ? (
          <div className="text-xs text-red-400 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-xs text-center py-6 opacity-60 flex flex-col items-center gap-2 text-[#7ec8e3]">
            <span className="animate-spin text-lg">⚙️</span>
            Loading datasets...
          </div>
        ) : (
          datasets.map((dataset) => (
            <div 
              key={dataset.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                datasetId === dataset.id 
                  ? 'bg-blue-500/10 border-blue-400/50' 
                  : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60 hover:border-blue-400/30'
              }`}
              onClick={() => handleSelectDataset(dataset.id)}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-sm text-slate-200">
                  {dataset.name}
                </div>
                {dataset.is_demo && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                    Demo
                  </span>
                )}
              </div>
              
              <div className="text-[10px] text-slate-400 mb-2">
                {dataset.description}
              </div>
              
              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono mt-2">
                <div className="flex items-center gap-1">
                  <span>📊</span> {dataset.variable_count} variables
                </div>
                <div className="flex items-center gap-1">
                  <span>📡</span> {dataset.source}
                </div>
              </div>

              {datasetId === dataset.id && (
                <div className="mt-3 text-[10px] text-center py-1 bg-blue-500/20 text-blue-300 rounded font-semibold tracking-wide">
                  ACTIVE DATASET
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
