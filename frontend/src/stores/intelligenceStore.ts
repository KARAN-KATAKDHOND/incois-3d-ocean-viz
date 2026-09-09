// === Ocean Intelligence — Centralized Dashboard Store ===
// All filter state + data cache for cross-filtering.

import { create } from 'zustand';
import type { OceanRegion } from '../types/intelligence';
import { OCEAN_REGIONS } from '../types/intelligence';

interface IntelligenceState {
  // Dataset
  datasetId: string;
  setDatasetId: (id: string) => void;

  // Time range (as indices into the dataset's time axis)
  startIdx: number;
  endIdx: number;
  setTimeRange: (start: number, end: number) => void;

  // Date range preset label
  rangePreset: string;
  setRangePreset: (label: string) => void;

  // Location
  lat: number | undefined;
  lon: number | undefined;
  setLocation: (lat: number | undefined, lon: number | undefined) => void;

  // Region
  selectedRegion: OceanRegion;
  setSelectedRegion: (region: OceanRegion) => void;

  // Depth
  depth: number | undefined;
  depthIndex: number;
  setDepth: (d: number | undefined) => void;
  setDepthIndex: (i: number) => void;

  // Selected variables for analysis
  primaryVariable: string;
  compareVariable: string;
  setPrimaryVariable: (v: string) => void;
  setCompareVariable: (v: string) => void;

  // UI state
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;

  // Compare mode
  compareDayA: number;
  compareDayB: number;
  setCompareDays: (a: number, b: number) => void;

  // Refresh trigger — incremented to force re-fetch
  refreshKey: number;
  triggerRefresh: () => void;

  // Loading
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, msg?: string) => void;
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  datasetId: 'noaa_sst_real',
  setDatasetId: (id) => set({ datasetId: id }),

  startIdx: 0,
  endIdx: 7,
  setTimeRange: (start, end) => set({ startIdx: start, endIdx: end }),

  rangePreset: '7 Days',
  setRangePreset: (label) => set({ rangePreset: label }),

  lat: undefined,
  lon: undefined,
  setLocation: (lat, lon) => set({ lat, lon }),

  selectedRegion: OCEAN_REGIONS[3], // Indian Ocean (North) — matches noaa_sst_real coverage
  setSelectedRegion: (region) => set({ selectedRegion: region, lat: region.lat, lon: region.lon }),

  depth: undefined,
  depthIndex: 0,
  setDepth: (d) => set({ depth: d }),
  setDepthIndex: (i) => set({ depthIndex: i }),

  primaryVariable: 'temperature',
  compareVariable: 'salinity',
  setPrimaryVariable: (v) => set({ primaryVariable: v }),
  setCompareVariable: (v) => set({ compareVariable: v }),

  activePanel: null,
  setActivePanel: (panel) => set({ activePanel: panel }),

  compareDayA: 0,
  compareDayB: 6,
  setCompareDays: (a, b) => set({ compareDayA: a, compareDayB: b }),

  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),

  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, msg = '') => set({ isLoading: loading, loadingMessage: msg }),
}));
