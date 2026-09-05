// === Instrument Detail Panel ===
// Floating panel showing observation info and depth-vs-variable profile.

import { useState, useEffect } from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import { observationApi, comparisonApi } from '../../services/api';
import { ProfileChart } from '../../charts/ProfileChart';
import { ComparisonChart } from '../../charts/ComparisonChart';
import type { ProfileData, ComparisonData, VariableType } from '../../types/ocean';

const QUALITY_COLORS: Record<string, string> = {
  valid: '#00c853',
  suspect: '#ffd600',
  missing: '#ff5252',
  interpolated: '#7c4dff',
};

export function InstrumentDetailPanel() {
  const selectedObservation = useOceanStore((s) => s.selectedObservation);
  const setSelectedObservation = useOceanStore((s) => s.setSelectedObservation);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [profileVariable, setProfileVariable] = useState<VariableType>('temperature');
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedObservation) return;

    setLoading(true);
    observationApi.getProfile(selectedObservation.id, profileVariable)
      .then(setProfileData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedObservation, profileVariable]);

  useEffect(() => {
    if (!selectedObservation || !showComparison) return;

    comparisonApi.compare({
      observation_id: selectedObservation.id,
      variable: profileVariable,
    })
      .then(setComparisonData)
      .catch(console.error);
  }, [selectedObservation, showComparison, profileVariable]);

  if (!selectedObservation) return null;

  const obs = selectedObservation;

  return (
    <div
      className="absolute right-72 top-14 w-96 max-h-[calc(100vh-140px)] overflow-y-auto glass-panel-strong animate-scale-in z-20"
      style={{ animation: 'scale-in 0.3s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'rgba(42, 108, 176, 0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {obs.instrument_type === 'argo' ? '🔵' :
             obs.instrument_type === 'glider' ? '🟡' :
             obs.instrument_type === 'ctd' ? '🟠' : '🟢'}
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#e0f4fa' }}>{obs.id}</div>
            <div className="text-[10px] uppercase" style={{ color: '#4b9cd3' }}>
              {obs.instrument_type}
            </div>
          </div>
        </div>
        <button
          onClick={() => setSelectedObservation(null)}
          className="text-sm hover:opacity-80"
          style={{ color: '#7ec8e3' }}
        >✕</button>
      </div>

      {/* Observation info */}
      <div className="px-4 py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-b"
        style={{ borderColor: 'rgba(42, 108, 176, 0.1)' }}>
        <div>
          <span style={{ color: '#4b9cd3' }}>Latitude: </span>
          <span className="font-mono" style={{ color: '#e0f4fa' }}>{obs.latitude.toFixed(4)}° N</span>
        </div>
        <div>
          <span style={{ color: '#4b9cd3' }}>Longitude: </span>
          <span className="font-mono" style={{ color: '#e0f4fa' }}>{obs.longitude.toFixed(4)}° E</span>
        </div>
        <div>
          <span style={{ color: '#4b9cd3' }}>Depth: </span>
          <span className="font-mono" style={{ color: '#e0f4fa' }}>{obs.depth} m</span>
        </div>
        <div>
          <span style={{ color: '#4b9cd3' }}>Quality: </span>
          <span className="font-mono font-semibold"
            style={{ color: QUALITY_COLORS[obs.quality] || '#7ec8e3' }}>
            {obs.quality.toUpperCase()}
          </span>
        </div>
        <div className="col-span-2">
          <span style={{ color: '#4b9cd3' }}>Time: </span>
          <span className="font-mono" style={{ color: '#e0f4fa' }}>
            {new Date(obs.timestamp).toUTCString().replace('GMT', 'UTC')}
          </span>
        </div>
        <div className="col-span-2">
          <span style={{ color: '#4b9cd3' }}>Source: </span>
          <span style={{ color: '#7ec8e3' }}>{obs.data_source}</span>
        </div>
        <div className="col-span-2">
          <span style={{ color: '#4b9cd3' }}>Variables: </span>
          <span style={{ color: '#7ec8e3' }}>{obs.variables.join(', ')}</span>
        </div>
      </div>

      {/* Variable tabs */}
      <div className="px-4 py-2 flex items-center gap-2">
        {(['temperature', 'salinity'] as VariableType[])
          .filter((v) => obs.variables.includes(v))
          .map((v) => (
            <button
              key={v}
              className={`tab-item ${profileVariable === v ? 'active' : ''}`}
              onClick={() => setProfileVariable(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
      </div>

      {/* Profile chart */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs" style={{ color: '#4b9cd3' }}>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
              style={{ borderColor: '#00e5ff', borderTopColor: 'transparent' }} />
            Loading profile...
          </div>
        ) : profileData ? (
          <ProfileChart data={profileData} />
        ) : null}
      </div>

      {/* Comparison toggle */}
      <div className="px-4 py-2 border-t" style={{ borderColor: 'rgba(42, 108, 176, 0.1)' }}>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="sci-button w-full justify-center text-xs"
        >
          {showComparison ? 'Hide' : 'Show'} Model vs Observation
        </button>

        {showComparison && comparisonData && (
          <div className="mt-3">
            <ComparisonChart data={comparisonData} />
          </div>
        )}
      </div>
    </div>
  );
}
