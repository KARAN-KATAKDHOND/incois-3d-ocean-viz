import { useMapStore } from '../store/useMapStore';
import { Play, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MapCanvas() {
  const { timeStep, setTimeStep } = useMapStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // Simple timeline animation effect
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStep((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setTimeStep]);

  return (
    <main className="flex-1 relative bg-slate-950 flex items-center justify-center">
      
      {/* 3D GLOBE CONTAINER (Phase 4) */}
      <div className="absolute inset-0 z-0" id="cesium-container">
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 m-4 rounded-xl">
          <span className="text-2xl font-bold mb-2">3D Globe Canvas</span>
          <p className="text-sm">Ready for CesiumJS (Phase 4)</p>
        </div>
      </div>

      {/* Temporal Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 z-10 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors flex items-center justify-center"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-1" />}
          </button>
          
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Simulation Time</span>
            <span className="text-sm font-mono text-blue-400">
              Jan 15, 2025 - {String(Math.floor((timeStep / 100) * 24)).padStart(2, '0')}:00 UTC
            </span>
          </div>
        </div>
        
        <input 
          type="range" 
          className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none" 
          min="0" 
          max="100" 
          value={timeStep}
          onChange={(e) => {
            setIsPlaying(false);
            setTimeStep(parseInt(e.target.value));
          }}
        />
      </div>
    </main>
  );
}