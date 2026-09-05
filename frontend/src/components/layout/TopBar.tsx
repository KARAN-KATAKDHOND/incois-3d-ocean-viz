// === Top Bar ===
// Application header with dataset selector and status indicators.

import { Globe2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOceanStore } from '../../stores/oceanStore';

export function TopBar() {
  const navigate = useNavigate();
  const datasetMeta = useOceanStore((s) => s.datasetMeta);
  const appMode = useOceanStore((s) => s.appMode);
  const setAppMode = useOceanStore((s) => s.setAppMode);
  const isLoading = useOceanStore((s) => s.isLoading);

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b"
      style={{
        background: 'rgba(10, 22, 40, 0.9)',
        borderColor: 'rgba(42, 108, 176, 0.2)',
        backdropFilter: 'blur(12px)',
      }}>
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-85 transition"
          style={{
            background: 'rgba(0, 229, 255, 0.1)',
            color: '#7ec8e3',
            border: '1px solid rgba(0, 229, 255, 0.18)',
          }}
          title="Coverage globe"
          aria-label="Coverage globe"
        >
          <Globe2 size={16} />
        </button>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00838f, #00e5ff)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M2 12c2-4 6-6 10-6s8 2 10 6c-2 4-6 6-10 6S4 16 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: '#e0f4fa' }}>
            Ocean Explorer
          </h1>
          <p className="text-[10px]" style={{ color: '#4b9cd3' }}>
            SIH26067 — 3D Ocean Data Visualization
          </p>
        </div>
        {datasetMeta?.is_demo && <span className="demo-badge">DEMO DATA</span>}
      </div>

      {/* Center: Dataset info */}
      <div className="flex items-center gap-4">
        {datasetMeta && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#7ec8e3' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12H2M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10z" />
            </svg>
            {datasetMeta.name}
          </div>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#00e5ff' }}>
            <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#00e5ff', borderTopColor: 'transparent' }} />
            Loading...
          </div>
        )}
      </div>

      {/* Right: Mode switcher & time */}
      <div className="flex items-center gap-3">
        <div className="tab-group">
          <button
            className={`tab-item ${appMode === 'professional' ? 'active' : ''}`}
            onClick={() => setAppMode('professional')}
          >
            Professional
          </button>
          <button
            className={`tab-item ${appMode === 'explore' ? 'active' : ''}`}
            onClick={() => setAppMode('explore')}
          >
            Explore
          </button>
        </div>
        <div className="text-xs font-mono" style={{ color: '#4b9cd3' }}>
          {new Date().toUTCString().replace('GMT', 'UTC')}
        </div>
      </div>
    </div>
  );
}
