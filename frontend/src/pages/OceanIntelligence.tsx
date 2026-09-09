// === Ocean Intelligence Dashboard — Main Page ===
// Complete responsive dashboard with all analytical panels.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useIntelligenceStore } from '../stores/intelligenceStore';
import { analysisApi } from '../services/analysisApi';
import type {
  SummaryResponse, TrendsResponse, CorrelationMatrixResponse,
  AnomalyResponse, DepthProfileResponse, HeatmapResponse,
  TSDiagramResponse, InferenceResponse, DataQualityResponse,
  DifferenceResponse, CorrelationResult,
} from '../types/intelligence';
import { OCEAN_REGIONS, DATE_RANGE_PRESETS } from '../types/intelligence';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, Area,
  BarChart, Bar, Cell, ComposedChart,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// ─── Utility helpers ────────────────────────────────
function formatDate(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return isoStr.slice(0, 10); }
}

function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

const CHART_COLORS = ['#00e5ff', '#ff6d00', '#00c853', '#aa00ff', '#ffd600', '#e91e63'];
const STRENGTH_COLORS: Record<string, string> = {
  strong: '#00e5ff', moderate: '#ffd600', weak: '#7ec8e3', negligible: '#4b5563',
};
const ANOMALY_COLORS: Record<string, string> = {
  normal: '#00c853', moderate: '#ffd600', significant: '#ff5252',
};

// ─── Skeleton Loader ────────────────────────────────
function Skeleton({ w = '100%', h = '20px', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ width: w, height: h, background: 'rgba(42,108,176,0.15)' }} />;
}

// ─── Card Wrapper ───────────────────────────────────
function DashCard({ title, subtitle, children, className = '', action }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`oi-card ${className}`}>
      <div className="oi-card-header">
        <div>
          <h3 className="oi-card-title">{title}</h3>
          {subtitle && <p className="oi-card-subtitle">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="oi-card-body">{children}</div>
    </div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="oi-tooltip">
      <p className="oi-tooltip-label">{typeof label === 'string' && label.includes('T') ? formatDate(label) : label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="oi-tooltip-item">
          {p.name}: <span className="font-mono font-bold">{formatNumber(p.value, 4)}</span>
        </p>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export function OceanIntelligence() {
  const navigate = useNavigate();
  const store = useIntelligenceStore();

  // Draft filter states (before applying)
  const [draftDataset, setDraftDataset] = useState(store.datasetId);
  const [draftRange, setDraftRange] = useState(store.rangePreset);
  const [draftRegion, setDraftRegion] = useState(store.selectedRegion.name);
  const [draftDepth, setDraftDepth] = useState<number | undefined>(store.depth);
  const [draftVariable, setDraftVariable] = useState(store.primaryVariable);

  const handleApplyFilters = () => {
    store.setDatasetId(draftDataset);
    const preset = DATE_RANGE_PRESETS.find(p => p.label === draftRange);
    if (preset) {
      store.setRangePreset(preset.label);
      store.setTimeRange(0, preset.days);
    }
    const region = OCEAN_REGIONS.find(r => r.name === draftRegion);
    if (region) store.setSelectedRegion(region);
    store.setDepth(draftDepth);
    store.setPrimaryVariable(draftVariable);
  };

  // Data states
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [corrMatrix, setCorrMatrix] = useState<CorrelationMatrixResponse | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyResponse | null>(null);
  const [depthProfile, setDepthProfile] = useState<DepthProfileResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [tsDiagram, setTsDiagram] = useState<TSDiagramResponse | null>(null);
  const [inference, setInference] = useState<InferenceResponse | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);
  const [difference, setDifference] = useState<DifferenceResponse | null>(null);
  const [pairCorr, setPairCorr] = useState<CorrelationResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedCorrPair, setSelectedCorrPair] = useState<[string, string] | null>(null);

  // Common params for all API calls
  const params = useMemo(() => ({
    dataset_id: store.datasetId,
    start_idx: store.startIdx,
    end_idx: store.endIdx,
    lat: store.lat,
    lon: store.lon,
    depth: store.depth,
  }), [store.datasetId, store.startIdx, store.endIdx, store.lat, store.lon, store.depth, store.refreshKey]);

  // ─── Data Fetching ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [summ, trnd, corr, anom, dp, hm, ts, inf, dq, diff] = await Promise.allSettled([
          analysisApi.getSummary(params),
          analysisApi.getTrends({ ...params, variables: 'temperature,salinity,current_speed' }),
          analysisApi.getCorrelationMatrix({ ...params, variables: 'temperature,salinity,current_speed' }),
          analysisApi.getAnomaly({ ...params, variable: store.primaryVariable }),
          analysisApi.getDepthProfile({ ...params, variable: store.primaryVariable, time_indices: '0,3,6' }),
          analysisApi.getHeatmap({ ...params, variable: store.primaryVariable }),
          analysisApi.getTSDiagram(params),
          analysisApi.getInference(params),
          analysisApi.getDataQuality({ dataset_id: store.datasetId }),
          analysisApi.getDifference({ ...params, variable: store.primaryVariable, time_idx_a: store.compareDayA, time_idx_b: store.compareDayB }),
        ]);

        if (cancelled) return;
        if (summ.status === 'fulfilled') setSummary(summ.value);
        if (trnd.status === 'fulfilled') setTrends(trnd.value);
        if (corr.status === 'fulfilled') setCorrMatrix(corr.value);
        if (anom.status === 'fulfilled') setAnomaly(anom.value);
        if (dp.status === 'fulfilled') setDepthProfile(dp.value);
        if (hm.status === 'fulfilled') setHeatmap(hm.value);
        if (ts.status === 'fulfilled') setTsDiagram(ts.value);
        if (inf.status === 'fulfilled') setInference(inf.value);
        if (dq.status === 'fulfilled') setDataQuality(dq.value);
        if (diff.status === 'fulfilled') setDifference(diff.value);
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [params, store.primaryVariable, store.compareDayA, store.compareDayB]);

  // Fetch pairwise correlation when a matrix cell is clicked
  useEffect(() => {
    if (!selectedCorrPair) { setPairCorr(null); return; }
    analysisApi.getCorrelation({
      ...params,
      variable_a: selectedCorrPair[0],
      variable_b: selectedCorrPair[1],
    }).then(setPairCorr).catch(console.error);
  }, [selectedCorrPair, params]);

  // ─── Trend Analysis Widget ──────────────────────────
  // Extracted Trend Analysis Widget for performance isolation

function TrendAnalysisWidget({ trends, store }: { trends: TrendsResponse | null; store: any }) {
  const [activePoint, setActivePoint] = useState<any>(null);

  const trendChartData = useMemo(() => {
    if (!trends?.trends?.length || !trends.times) return [];
    return trends.times.map((t, i) => {
      const row: any = { time: formatDate(t) };
      for (const tr of trends.trends) {
        const current = tr.values[i];
        const prev = i > 0 ? tr.values[i - 1] : current;
        row[tr.display_name] = current;
        row[`${tr.display_name}_isUp`] = current >= prev;
        row[`${tr.display_name}_delta`] = current - prev;
      }
      return row;
    });
  }, [trends]);

  useEffect(() => {
    if (trendChartData && trendChartData.length > 0 && !activePoint) {
      setActivePoint(trendChartData[trendChartData.length - 1]);
    }
  }, [trendChartData]);

  const SimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(10, 22, 40, 0.9)', border: '1px solid rgba(42,108,176,0.5)', padding: '8px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
          <p style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => {
            const val = entry.value;
            return (
              <div key={index} style={{ color: entry.color || '#fff', fontSize: '11px' }}>
                {entry.name}: {formatNumber(val, 2)}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!trends?.trends?.length) {
    return (
      <DashCard title="📈 Multi-Day Trend Analysis" subtitle={`${store.rangePreset} • ${store.selectedRegion.name}`} className="oi-full-width">
        <Skeleton h="250px" />
      </DashCard>
    );
  }

  return (
    <DashCard title="📈 Multi-Day Trend Analysis" subtitle={`${store.rangePreset} • ${store.selectedRegion.name}`} className="oi-full-width">
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 65%', minWidth: '300px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart 
              data={trendChartData} 
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload) {
                  setActivePoint(e.activePayload[0].payload);
                }
              }}
              style={{ cursor: 'crosshair' }}
            >
              <defs>
                {trends.trends.map((tr, i) => (
                  <linearGradient key={`color-${tr.variable}`} id={`color-${tr.variable}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.6}/>
                    <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10, fill: CHART_COLORS[0] }} 
                axisLine={false} 
                tickLine={false} 
                domain={['auto', 'auto']}
                dx={-10}
              />
              <YAxis 
                yAxisId="right"
                orientation="right" 
                tick={{ fontSize: 10, fill: CHART_COLORS[1] || '#00e5ff' }} 
                axisLine={false} 
                tickLine={false} 
                domain={['auto', 'auto']}
                dx={10}
              />
              <Tooltip 
                content={<SimpleTooltip />} 
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} 
                isAnimationActive={false}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#e2e8f0', paddingTop: '10px' }} iconType="circle" />
              {trends.trends.map((tr, i) => (
                <Area
                  key={tr.variable}
                  yAxisId={i === 0 ? "left" : "right"}
                  type="monotone"
                  dataKey={tr.display_name}
                  name={tr.display_name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#color-${tr.variable})`}
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: CHART_COLORS[i % CHART_COLORS.length], stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Active Point Detailed Inference Panel */}
        <div style={{ flex: '1 1 30%', minWidth: '250px', background: 'rgba(10, 22, 40, 0.6)', border: '1px solid rgba(42, 108, 176, 0.3)', padding: '24px', borderRadius: '12px', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Target Day</span>
            <span style={{ color: '#00e5ff' }}>{activePoint?.time || 'Hover to analyze'}</span>
          </h4>
          
          {activePoint ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {trends.trends.map((tr, i) => {
                const val = activePoint[tr.display_name];
                const delta = activePoint[`${tr.display_name}_delta`];
                const isUp = activePoint[`${tr.display_name}_isUp`];
                if (val === undefined) return null;
                
                const getInferenceText = () => {
                  if (Math.abs(delta) < 0.005) return "Stable day-over-day momentum.";
                  if (isUp) return `Experiencing an upward thermal/kinetic trend (+${delta.toFixed(3)}).`;
                  return `Demonstrating a cooling/decelerating trend (${delta.toFixed(3)}).`;
                };

                return (
                  <div key={tr.variable} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: `4px solid ${CHART_COLORS[i % CHART_COLORS.length]}` }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      {tr.display_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>{formatNumber(val, 3)}</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>{tr.unit}</span>
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '10px', color: isUp ? '#00e676' : '#ff5252', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{isUp ? '▲' : '▼'}</span>
                      <span>{getInferenceText()}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#00e5ff', borderRadius: '50%', marginRight: '6px', animation: 'pulse 2s infinite' }}></span>
                Live Hover Tracking Active
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '60px' }}>
              Glide your cursor across the chart line to extract instant parameter inferences.
            </div>
          )}
        </div>
      </div>
    </DashCard>
  );
}

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="oi-root">
      {/* ═══ TOP NAVIGATION ═══ */}
      <header className="oi-topnav">
        <div className="oi-topnav-left">
          <button className="oi-nav-back" onClick={() => navigate('/')} title="Back to Globe">←</button>
          <div className="oi-brand">
            <span className="oi-brand-icon">🌊</span>
            <div>
              <div className="oi-brand-name">OCEAN INTELLIGENCE</div>
              <div className="oi-brand-sub">Multi-Day Analysis & Scientific Inference</div>
            </div>
          </div>
        </div>
        <div className="oi-topnav-center">
          <div className="oi-nav-chip">{store.selectedRegion.name}</div>
          <div className="oi-nav-chip">{store.rangePreset}</div>
        </div>
        <div className="oi-topnav-right">
          {dataQuality && (
            <div className="oi-status-dot" title="Data loaded">
              <span className="oi-pulse-dot" /> {dataQuality.total_observations.toLocaleString()} obs
            </div>
          )}
          <button className="oi-nav-btn" onClick={() => navigate('/visualization')} title="3D Visualization">🔬 3D View</button>
        </div>
      </header>

      {/* ═══ FILTER BAR ═══ */}
      <div className="oi-filterbar">
        <div className="oi-filter-group">
          <label className="oi-filter-label">Dataset</label>
          <select
            className="oi-select"
            value={draftDataset}
            onChange={(e) => setDraftDataset(e.target.value)}
          >
            <option value="noaa_sst_real">NOAA SST Real (30 days)</option>
            <option value="mercatorglorys12v1_gl12_mean_202601">Mercator Glorys12v1 (Jan 2026)</option>
            <option value="mercatorglorys12v1_gl12_mean_20260101_R20260107">Mercator Glorys12v1 (Jan 01-07)</option>
            <option value="netcdf">NetCDF Generic</option>
            <option value="ocean_dummy_data_7days">Dummy Data (7 days)</option>
          </select>
        </div>
        <div className="oi-filter-group">
          <label className="oi-filter-label">Date Range</label>
          <div className="oi-preset-row">
            {DATE_RANGE_PRESETS.map((p) => (
              <button
                key={p.label}
                className={`oi-preset-btn ${draftRange === p.label ? 'active' : ''}`}
                onClick={() => setDraftRange(p.label)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="oi-filter-group">
          <label className="oi-filter-label">Region</label>
          <select
            className="oi-select"
            value={draftRegion}
            onChange={(e) => setDraftRegion(e.target.value)}
          >
            {OCEAN_REGIONS.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="oi-filter-group">
          <label className="oi-filter-label">Depth</label>
          <select
            className="oi-select"
            value={draftDepth ?? ''}
            onChange={(e) => setDraftDepth(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Surface (avg)</option>
            {[0, 5, 10, 50, 100, 200, 500, 1000].map((d) => (
              <option key={d} value={d}>{d}m</option>
            ))}
          </select>
        </div>
        <div className="oi-filter-group">
          <label className="oi-filter-label">Variable</label>
          <select className="oi-select" value={draftVariable}
            onChange={(e) => setDraftVariable(e.target.value)}>
            <option value="temperature">Temperature</option>
            <option value="salinity">Salinity</option>
            <option value="current_speed">Current Speed</option>
            <option value="u">Zonal Velocity (U)</option>
            <option value="v">Meridional Velocity (V)</option>
          </select>
        </div>
        <div className="oi-filter-group" style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: '1px' }}>
          <button className="sci-button sci-button-primary" style={{ height: '32px' }} onClick={handleApplyFilters}>
            Apply Filters
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="oi-main">
        {/* ─── KPI CARDS ─── */}
        <section className="oi-kpi-row">
          {loading && !summary ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="oi-kpi-card">
                <Skeleton h="14px" w="60%" />
                <Skeleton h="28px" w="40%" className="mt-2" />
                <Skeleton h="12px" w="80%" className="mt-2" />
              </div>
            ))
          ) : (
            <>
              {summary?.cards.map((card) => (
                <div
                  key={card.variable}
                  className={`oi-kpi-card ${card.anomaly_status !== 'normal' ? 'oi-kpi-anomaly' : ''}`}
                  onClick={() => store.setPrimaryVariable(card.variable)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="oi-kpi-name">{card.display_name}</div>
                  <div className="oi-kpi-value">
                    {formatNumber(card.current_value, 2)}
                    <span className="oi-kpi-unit">{card.unit}</span>
                  </div>
                  <div className={`oi-kpi-delta ${card.delta >= 0 ? 'positive' : 'negative'}`}>
                    {card.delta >= 0 ? '↑' : '↓'} {card.delta >= 0 ? '+' : ''}{formatNumber(card.delta, 4)} {card.unit}
                    <span className="oi-kpi-pct">({card.pct_change >= 0 ? '+' : ''}{formatNumber(card.pct_change, 1)}%)</span>
                  </div>
                  <div className="oi-kpi-sparkline">
                    {card.sparkline.map((v, j) => {
                      const min = Math.min(...card.sparkline);
                      const max = Math.max(...card.sparkline);
                      const h = max > min ? ((v - min) / (max - min)) * 24 + 4 : 14;
                      return <div key={j} className="oi-spark-bar" style={{ height: `${h}px` }} />;
                    })}
                  </div>
                  {card.anomaly_status !== 'normal' && (
                    <div className="oi-kpi-badge" style={{ background: ANOMALY_COLORS[card.anomaly_status] }}>
                      ⚠ {card.anomaly_status}
                    </div>
                  )}
                </div>
              ))}
              {/* Global anomaly */}
              {summary && (
                <div className={`oi-kpi-card oi-kpi-global ${summary.global_anomaly_status !== 'normal' ? 'oi-kpi-anomaly' : ''}`}>
                  <div className="oi-kpi-name">Anomaly Score</div>
                  <div className="oi-kpi-value">{formatNumber(summary.global_anomaly_score, 2)}</div>
                  <div className="oi-kpi-badge" style={{ background: ANOMALY_COLORS[summary.global_anomaly_status] || '#4b5563' }}>
                    {summary.global_anomaly_status === 'significant' ? '⚠ Significant' :
                     summary.global_anomaly_status === 'moderate' ? '⚡ Moderate' : '✓ Normal'}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ─── ROW 1: TREND + DIFFERENCE ─── */}
        <section className="oi-grid-2">
          {/* Multi-day Trend */}
          <TrendAnalysisWidget trends={trends} store={store} />

          {/* Compare Two Days */}
          <DashCard
            title="⚖️ Compare Two Days"
            subtitle={difference ? `${formatDate(difference.time_a)} → ${formatDate(difference.time_b)}` : ''}
            action={
              <div className="flex gap-2 items-center">
                <select className="oi-select-sm" value={store.compareDayA}
                  onChange={(e) => store.setCompareDays(Number(e.target.value), store.compareDayB)}>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i} value={i}>Day {i + 1}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">vs</span>
                <select className="oi-select-sm" value={store.compareDayB}
                  onChange={(e) => store.setCompareDays(store.compareDayA, Number(e.target.value))}>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i} value={i}>Day {i + 1}</option>
                  ))}
                </select>
              </div>
            }
          >
            {!difference ? <Skeleton h="200px" /> : (
              <div className="oi-diff-grid">
                <div className="oi-diff-card">
                  <div className="oi-diff-label">Before</div>
                  <div className="oi-diff-val">{formatNumber(difference.mean_a, 3)}</div>
                  <div className="oi-diff-unit">{difference.unit}</div>
                </div>
                <div className="oi-diff-card">
                  <div className="oi-diff-label">After</div>
                  <div className="oi-diff-val">{formatNumber(difference.mean_b, 3)}</div>
                  <div className="oi-diff-unit">{difference.unit}</div>
                </div>
                <div className={`oi-diff-card oi-diff-delta ${difference.mean_diff >= 0 ? 'positive' : 'negative'}`}>
                  <div className="oi-diff-label">Δ Difference</div>
                  <div className="oi-diff-val">{difference.mean_diff >= 0 ? '+' : ''}{formatNumber(difference.mean_diff, 4)}</div>
                  <div className="oi-diff-unit">{difference.unit}</div>
                </div>
                <div className="oi-diff-card">
                  <div className="oi-diff-label">Max Δ</div>
                  <div className="oi-diff-val">{formatNumber(difference.max_diff, 4)}</div>
                  <div className="oi-diff-unit">{difference.unit}</div>
                </div>
              </div>
            )}
          </DashCard>
        </section>

        {/* ─── ROW 2: DEPTH×TIME HEATMAP + T-S DIAGRAM ─── */}
        <section className="oi-grid-2">
          {/* Depth×Time Heatmap */}
          <DashCard title="🌡️ Depth × Time Heatmap" subtitle={heatmap?.display_name || ''}>
            {!heatmap ? <Skeleton h="280px" /> : (
              <HeatmapCanvas heatmap={heatmap} />
            )}
          </DashCard>

          {/* T-S Diagram */}
          <DashCard title="🔬 Temperature–Salinity Diagram" subtitle="Color by depth">
            {!tsDiagram?.points?.length ? <Skeleton h="280px" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,108,176,0.15)" />
                  <XAxis
                    type="number" dataKey="salinity" name="Salinity"
                    tick={{ fontSize: 11, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                    label={{ value: 'Salinity (PSU)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#7ec8e3' }}
                  />
                  <YAxis
                    type="number" dataKey="temperature" name="Temperature"
                    tick={{ fontSize: 11, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                    label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#7ec8e3' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div className="oi-tooltip">
                          <p>T: <b>{formatNumber(p.temperature, 2)}°C</b></p>
                          <p>S: <b>{formatNumber(p.salinity, 2)} PSU</b></p>
                          <p>Depth: <b>{p.depth}m</b></p>
                          <p>Time: <b>{formatDate(p.time)}</b></p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={tsDiagram.points} fill="#00e5ff">
                    {tsDiagram.points.map((p, i) => {
                      const maxD = Math.max(...tsDiagram.points.map(pp => pp.depth), 1);
                      const frac = p.depth / maxD;
                      const r = Math.round(0 + frac * 255);
                      const g = Math.round(229 - frac * 180);
                      const b = Math.round(255 - frac * 100);
                      return <Cell key={i} fill={`rgb(${r},${g},${b})`} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </DashCard>
        </section>

        {/* ─── ROW 3: CORRELATION MATRIX + DEPTH PROFILE ─── */}
        <section className="oi-grid-2">
          {/* Correlation Matrix */}
          <DashCard title="🔗 Parameter Correlation Matrix" subtitle={`N=${corrMatrix?.n_observations || 0} observations`}>
            {!corrMatrix ? <Skeleton h="260px" /> : (
              <div className="oi-corr-matrix">
                {/* Header row */}
                <div className="oi-corr-row">
                  <div className="oi-corr-cell oi-corr-header" />
                  {corrMatrix.labels.map((l) => (
                    <div key={l.name} className="oi-corr-cell oi-corr-header">{l.display.split(' ')[0]}</div>
                  ))}
                </div>
                {/* Data rows */}
                {corrMatrix.matrix.map((row, i) => (
                  <div key={i} className="oi-corr-row">
                    <div className="oi-corr-cell oi-corr-header">{corrMatrix.labels[i].display.split(' ')[0]}</div>
                    {row.map((val, j) => {
                      const isIdentity = i === j;
                      const absR = Math.abs(val);
                      const hue = val > 0 ? 200 : 15;
                      const sat = isIdentity ? 0 : Math.round(absR * 100);
                      const light = isIdentity ? 20 : Math.round(15 + (1 - absR) * 20);
                      return (
                        <div
                          key={j}
                          className={`oi-corr-cell ${!isIdentity ? 'oi-corr-clickable' : ''}`}
                          style={{ background: `hsla(${hue}, ${sat}%, ${light}%, ${isIdentity ? 0.3 : 0.6 + absR * 0.4})` }}
                          onClick={() => {
                            if (!isIdentity) setSelectedCorrPair([corrMatrix.variables[i], corrMatrix.variables[j]]);
                          }}
                          role={!isIdentity ? 'button' : undefined}
                          tabIndex={!isIdentity ? 0 : undefined}
                        >
                          <span className="oi-corr-val">{val >= 0 ? '+' : ''}{formatNumber(val, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            {/* Pairwise detail */}
            {pairCorr && (
              <div className="oi-pair-detail">
                <div className="oi-pair-header">
                  <h4>{pairCorr.display_a} ↔ {pairCorr.display_b}</h4>
                  <button className="oi-close-btn" onClick={() => { setSelectedCorrPair(null); setPairCorr(null); }}>✕</button>
                </div>
                <div className="oi-pair-stats">
                  <div className="oi-stat"><span>Pearson r</span><b style={{ color: STRENGTH_COLORS[pairCorr.strength] }}>{formatNumber(pairCorr.pearson_r, 4)}</b></div>
                  <div className="oi-stat"><span>Spearman ρ</span><b>{formatNumber(pairCorr.spearman_r, 4)}</b></div>
                  <div className="oi-stat"><span>Strength</span><b className="capitalize" style={{ color: STRENGTH_COLORS[pairCorr.strength] }}>{pairCorr.strength}</b></div>
                  <div className="oi-stat"><span>Direction</span><b className="capitalize">{pairCorr.direction}</b></div>
                  <div className="oi-stat"><span>N</span><b>{pairCorr.n_observations}</b></div>
                </div>
                <p className="oi-pair-desc">{pairCorr.description}</p>
                {/* Scatter plot */}
                <ResponsiveContainer width="100%" height={180}>
                  <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,108,176,0.15)" />
                    <XAxis type="number" dataKey="a" name={pairCorr.display_a}
                      tick={{ fontSize: 10, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                      label={{ value: pairCorr.display_a, position: 'insideBottom', offset: -10, fontSize: 10, fill: '#7ec8e3' }} />
                    <YAxis type="number" dataKey="b" name={pairCorr.display_b}
                      tick={{ fontSize: 10, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                      label={{ value: pairCorr.display_b, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#7ec8e3' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Scatter
                      data={pairCorr.values_a.map((a, i) => ({ a, b: pairCorr.values_b[i] }))}
                      fill="#00e5ff" fillOpacity={0.7}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashCard>

          {/* Depth Profile */}
          <DashCard title="📐 Depth Profile" subtitle={depthProfile?.display_name || ''}>
            {!depthProfile ? <Skeleton h="280px" /> : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    layout="vertical"
                    data={depthProfile.depths.map((d, di) => {
                      const row: any = { depth: d };
                      depthProfile.profiles.forEach((p) => {
                        row[formatDate(p.time) || `T${p.time_index}`] = p.values[di];
                      });
                      return row;
                    })}
                    margin={{ top: 5, right: 20, bottom: 5, left: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,108,176,0.15)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                      label={{ value: `${depthProfile.display_name} (${depthProfile.unit})`, position: 'insideBottom', offset: -2, fontSize: 10, fill: '#7ec8e3' }} />
                    <YAxis type="number" dataKey="depth" reversed tick={{ fontSize: 10, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                      label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#7ec8e3' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#7ec8e3' }} />
                    {depthProfile.profiles.map((p, i) => (
                      <Line
                        key={p.time_index}
                        type="monotone"
                        dataKey={formatDate(p.time) || `T${p.time_index}`}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                {depthProfile.gradient_info && (
                  <div className="oi-gradient-badge">
                    🌊 Estimated {depthProfile.gradient_info.type}: ~{depthProfile.gradient_info.depth}m depth
                  </div>
                )}
              </>
            )}
          </DashCard>
        </section>

        {/* ─── ROW 4: ANOMALY + DISCOVERED RELATIONSHIPS ─── */}
        <section className="oi-grid-2">
          {/* Anomaly Detection */}
          <DashCard title="⚠️ Anomaly Detection" subtitle={anomaly?.display_name || ''}>
            {!anomaly ? <Skeleton h="200px" /> : (
              <>
                <div className="oi-anomaly-summary">
                  <div className="oi-anomaly-badge" style={{ borderColor: ANOMALY_COLORS[anomaly.overall_status] }}>
                    <span className="oi-anomaly-status" style={{ color: ANOMALY_COLORS[anomaly.overall_status] }}>
                      {anomaly.overall_status.toUpperCase()}
                    </span>
                    <span className="oi-anomaly-sub">
                      Mean: {formatNumber(anomaly.period_mean, 3)} ± {formatNumber(anomaly.period_std, 4)}
                    </span>
                  </div>
                  <div className="oi-anomaly-counts">
                    <span style={{ color: ANOMALY_COLORS.significant }}>⬤ {anomaly.n_significant} significant</span>
                    <span style={{ color: ANOMALY_COLORS.moderate }}>⬤ {anomaly.n_moderate} moderate</span>
                    <span style={{ color: ANOMALY_COLORS.normal }}>⬤ {anomaly.n_normal} normal</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={anomaly.daily} margin={{ top: 5, right: 10, bottom: 20, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,108,176,0.15)" />
                    <XAxis dataKey="time" tickFormatter={formatDate} tick={{ fontSize: 9, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)" />
                    <YAxis tick={{ fontSize: 10, fill: '#7ec8e3' }} stroke="rgba(42,108,176,0.3)"
                      label={{ value: 'Z-score', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#7ec8e3' }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="oi-tooltip">
                          <p>{formatDate(d.time)}</p>
                          <p>Observed: <b>{formatNumber(d.observed, 4)}</b></p>
                          <p>Expected: <b>{formatNumber(d.expected, 4)}</b></p>
                          <p>Z-score: <b>{formatNumber(d.z_score, 3)}</b></p>
                          <p>Status: <b style={{ color: ANOMALY_COLORS[d.status] }}>{d.status}</b></p>
                        </div>
                      );
                    }} />
                    <Bar dataKey="z_score" name="Z-Score">
                      {anomaly.daily.map((d, i) => (
                        <Cell key={i} fill={ANOMALY_COLORS[d.status]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </DashCard>

          {/* Discovered Relationships */}
          <DashCard title="🔎 Discovered Relationships" subtitle="Ranked by correlation strength">
            {!inference?.discovered_relationships?.length && !inference?.change_events?.length ? (
              <div className="oi-empty">
                <p>No strong relationships detected in the selected period.</p>
                <p className="text-xs mt-1 opacity-60">Try expanding the date range or selecting a different region.</p>
              </div>
            ) : (
              <div className="oi-relationships-list">
                {inference?.discovered_relationships?.map((rel, i) => (
                  <div key={i} className="oi-rel-card" onClick={() => setSelectedCorrPair([rel.variable_a, rel.variable_b])} role="button" tabIndex={0}>
                    <div className="oi-rel-header">
                      <span className="oi-rel-rank">#{i + 1}</span>
                      <span className="oi-rel-pair">{rel.display_a} ↔ {rel.display_b}</span>
                      <span className="oi-rel-badge" style={{ background: STRENGTH_COLORS[rel.strength] }}>
                        {rel.strength}
                      </span>
                    </div>
                    <div className="oi-rel-r">r = {rel.pearson_r >= 0 ? '+' : ''}{formatNumber(rel.pearson_r, 3)}</div>
                    <p className="oi-rel-interp">{rel.interpretation}</p>
                  </div>
                ))}
                {/* Change events */}
                {inference?.change_events?.length ? (
                  <div className="oi-changes">
                    <h4 className="oi-changes-title">📋 What Changed</h4>
                    {inference.change_events.map((ev, i) => (
                      <div key={i} className="oi-change-item">
                        <span className={`oi-change-dir ${ev.direction === 'increased' ? 'up' : 'down'}`}>
                          {ev.direction === 'increased' ? '↑' : '↓'}
                        </span>
                        <span>{ev.description}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </DashCard>
        </section>

        {/* ─── ROW 5: INFERENCE PANEL ─── */}
        <section className="oi-full-width">
          <DashCard title="🧠 Ocean Insight" subtitle="Scientific Inference Engine" className="oi-insight-card">
            {!inference?.primary_insight ? (
              <div className="oi-insight-empty">
                <p>🔬 Analyzing ocean parameters...</p>
                <p className="text-xs mt-2 opacity-60">
                  The inference engine computes statistical relationships between parameters
                  and generates scientific interpretations. Expand the date range for stronger signals.
                </p>
              </div>
            ) : (
              <div className="oi-insight-content">
                <div className="oi-insight-title">{inference.primary_insight.title}</div>

                <div className="oi-insight-sections">
                  <div className="oi-insight-section">
                    <h5>📊 Observation</h5>
                    <p>{inference.primary_insight.observation}</p>
                  </div>

                  <div className="oi-insight-section">
                    <h5>📈 Statistical Evidence</h5>
                    <p>{inference.primary_insight.statistical_evidence}</p>
                  </div>

                  <div className="oi-insight-section">
                    <h5>🔬 Possible Interpretation</h5>
                    <p className="oi-insight-interp">{inference.primary_insight.interpretation}</p>
                    <p className="oi-insight-caveat">
                      ⚠ This is a statistical association, not a confirmed causal relationship.
                      Additional data and domain expertise should be consulted.
                    </p>
                  </div>

                  <div className="oi-insight-section">
                    <h5>🎯 Evidence Summary</h5>
                    <ul>
                      {inference.primary_insight.evidence_summary.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="oi-insight-section">
                    <h5>🔍 Recommended Investigation</h5>
                    <ul>
                      {inference.primary_insight.recommended_investigation.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={`oi-confidence-badge oi-conf-${inference.primary_insight.confidence.level}`}>
                  <span className="oi-conf-label">Confidence:</span>
                  <span className="oi-conf-level">{inference.primary_insight.confidence.level.toUpperCase()}</span>
                  <div className="oi-conf-reasons">
                    {inference.primary_insight.confidence.reasons.map((r, i) => (
                      <span key={i}>{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DashCard>
        </section>

        {/* ─── ROW 6: DATA QUALITY + METHODOLOGY ─── */}
        <section className="oi-grid-2">
          <DashCard title="📊 Data Quality" subtitle="Dataset integrity metrics">
            {!dataQuality ? <Skeleton h="200px" /> : (
              <div className="oi-dq-grid">
                <div className="oi-dq-item">
                  <span className="oi-dq-label">Total Observations</span>
                  <span className="oi-dq-value">{dataQuality.total_observations.toLocaleString()}</span>
                </div>
                <div className="oi-dq-item">
                  <span className="oi-dq-label">Missing Data</span>
                  <span className="oi-dq-value">{dataQuality.overall_missing_pct}%</span>
                </div>
                <div className="oi-dq-item">
                  <span className="oi-dq-label">Variables</span>
                  <span className="oi-dq-value">{dataQuality.total_variables}</span>
                </div>
                <div className="oi-dq-item">
                  <span className="oi-dq-label">Spatial Coverage</span>
                  <span className="oi-dq-value">
                    {dataQuality.spatial_coverage.lat_min}°–{dataQuality.spatial_coverage.lat_max}°N
                  </span>
                </div>
                <div className="oi-dq-item">
                  <span className="oi-dq-label">Depth Range</span>
                  <span className="oi-dq-value">0–{dataQuality.depth_coverage.max}m ({dataQuality.depth_coverage.n_levels} levels)</span>
                </div>
                <div className="oi-dq-item">
                  <span className="oi-dq-label">Time Steps</span>
                  <span className="oi-dq-value">{dataQuality.temporal_coverage.n_time_steps} days</span>
                </div>
              </div>
            )}
          </DashCard>

          <DashCard title="📖 Methodology" subtitle="How metrics are computed">
            {!dataQuality ? <Skeleton h="200px" /> : (
              <div className="oi-methodology">
                {Object.entries(dataQuality.methodology).map(([key, val]) => (
                  <details key={key} className="oi-method-item">
                    <summary className="oi-method-title">{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</summary>
                    <p className="oi-method-desc">{val}</p>
                  </details>
                ))}
              </div>
            )}
          </DashCard>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="oi-footer">
        <span>🌊 INCOIS Ocean Intelligence Platform — SIH 2026</span>
        <span>Data: NOAA / Mercator Ocean / INCOIS</span>
      </footer>
    </div>
  );
}

// ─── Depth×Time Heatmap Canvas Component ────────────
function HeatmapCanvas({ heatmap }: { heatmap: HeatmapResponse }) {
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !heatmap.data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [nTime, nDepth] = heatmap.shape;
    const width = canvas.width;
    const height = canvas.height;
    const cellW = width / nTime;
    const cellH = height / nDepth;

    const vmin = heatmap.min_value;
    const vmax = heatmap.max_value;
    const range = vmax - vmin || 1;

    for (let t = 0; t < nTime; t++) {
      for (let d = 0; d < nDepth; d++) {
        const val = heatmap.data[t * nDepth + d];
        const frac = (val - vmin) / range;

        // Turbo-inspired colormap
        const r = Math.round(Math.max(0, Math.min(255, 34.61 + frac * (1172.33 - frac * (10793.56 - frac * (33300.12 - frac * (38394.49 - frac * 14825.05)))))));
        const g = Math.round(Math.max(0, Math.min(255, 23.31 + frac * (557.33 + frac * (1225.33 - frac * (3574.96 - frac * (1073.77 + frac * 707.56)))))));
        const b = Math.round(Math.max(0, Math.min(255, 27.2 + frac * (3211.1 - frac * (15327.97 - frac * (27814 - frac * (22569.18 - frac * 6838.66)))))));

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(t * cellW, d * cellH, cellW + 1, cellH + 1);
      }
    }

    // Axis labels
    ctx.fillStyle = '#7ec8e3';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let t = 0; t < nTime; t += Math.max(1, Math.floor(nTime / 6))) {
      ctx.fillText(formatDate(heatmap.times[t]), t * cellW + cellW / 2, height - 2);
    }
    ctx.textAlign = 'right';
    for (let d = 0; d < nDepth; d++) {
      ctx.fillText(`${heatmap.depths[d]}m`, 35, d * cellH + cellH / 2 + 4);
    }
  }, [heatmap]);

  return (
    <div className="oi-heatmap-container">
      <canvas ref={canvasRef} width={600} height={280} className="oi-heatmap-canvas" />
      <div className="oi-heatmap-legend">
        <span>{formatNumber(heatmap.min_value, 1)}</span>
        <div className="oi-heatmap-gradient" />
        <span>{formatNumber(heatmap.max_value, 1)} {heatmap.unit}</span>
      </div>
    </div>
  );
}
