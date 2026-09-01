import { create } from 'zustand';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export const useMapStore = create((set, get) => ({
  // ─── Active Data Layers ─────────────────────────────────────
  activeLayers: {
    sst: false,        // Sea Surface Temperature
    salinity: false,   // Salinity
    argo: false,       // Argo Floats
    gliders: false,    // Underwater Gliders
  },

  // ─── Visualization Controls ─────────────────────────────────
  layerOpacity: 0.8,
  verticalExaggeration: 1.0,

  // ─── Temporal Controls (Timeline) ───────────────────────────
  timeStep: 0,

  // ─── Theme ──────────────────────────────────────────────────
  theme: 'dark',

  // ─── API-Driven Dataset State ───────────────────────────────
  availableDatasets: [],       // From GET /api/v1/datasets
  activeDatasetId: null,       // Currently selected gridded dataset
  activeVariable: 'temperature',
  activeDepthIdx: 0,
  activeTimeIdx: 0,

  // ─── Loaded Data ────────────────────────────────────────────
  sliceData: null,             // Current 2D slice from API
  profileData: null,           // Current vertical profile from API
  insituData: null,            // Current GeoJSON FeatureCollection
  datasetMetadata: null,       // Metadata for selected dataset

  // ─── Loading States ─────────────────────────────────────────
  isLoadingDatasets: false,
  isLoadingSlice: false,
  isLoadingProfile: false,
  isLoadingInsitu: false,
  apiError: null,

  // ─── Actions ────────────────────────────────────────────────

  toggleLayer: (layerId) => set((state) => ({
    activeLayers: {
      ...state.activeLayers,
      [layerId]: !state.activeLayers[layerId]
    }
  })),

  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),

  setLayerOpacity: (opacity) => set({ layerOpacity: opacity }),
  setVerticalExaggeration: (exaggeration) => set({ verticalExaggeration: exaggeration }),
  setTimeStep: (step) => set({ timeStep: step }),

  setActiveVariable: (variable) => set({ activeVariable: variable }),
  setActiveDepthIdx: (idx) => set({ activeDepthIdx: idx }),
  setActiveTimeIdx: (idx) => set({ activeTimeIdx: idx }),

  // ─── API Fetch Actions ──────────────────────────────────────

  fetchDatasets: async () => {
    set({ isLoadingDatasets: true, apiError: null });
    try {
      const resp = await fetch(`${API_BASE}/api/v1/datasets`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const datasets = data.datasets || [];
      set({ availableDatasets: datasets, isLoadingDatasets: false });

      // Auto-select first gridded dataset if none selected
      const state = get();
      if (!state.activeDatasetId && datasets.length > 0) {
        const gridded = datasets.find(d => d.type === 'gridded');
        if (gridded) {
          set({
            activeDatasetId: gridded.dataset_id,
            datasetMetadata: gridded,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch datasets:', err);
      set({ isLoadingDatasets: false, apiError: err.message });
    }
  },

  setActiveDataset: (datasetId) => {
    const state = get();
    const meta = state.availableDatasets.find(d => d.dataset_id === datasetId);
    set({
      activeDatasetId: datasetId,
      datasetMetadata: meta || null,
      activeDepthIdx: 0,
      activeTimeIdx: 0,
      sliceData: null,
    });
  },

  fetchSlice: async () => {
    const state = get();
    if (!state.activeDatasetId) return;

    set({ isLoadingSlice: true, apiError: null });
    try {
      const params = new URLSearchParams({
        dataset_id: state.activeDatasetId,
        variable: state.activeVariable,
        depth_idx: String(state.activeDepthIdx),
        time_idx: String(state.activeTimeIdx),
      });
      const resp = await fetch(`${API_BASE}/api/v1/slice?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      set({ sliceData: data, isLoadingSlice: false });
    } catch (err) {
      console.warn('Failed to fetch slice:', err);
      set({ isLoadingSlice: false, apiError: err.message });
    }
  },

  fetchProfile: async (lat, lon) => {
    const state = get();
    if (!state.activeDatasetId) return;

    set({ isLoadingProfile: true });
    try {
      const params = new URLSearchParams({
        dataset_id: state.activeDatasetId,
        variable: state.activeVariable,
        lat: String(lat),
        lon: String(lon),
        time_idx: String(state.activeTimeIdx),
      });
      const resp = await fetch(`${API_BASE}/api/v1/profile?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      set({ profileData: data, isLoadingProfile: false });
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
      set({ isLoadingProfile: false });
    }
  },

  fetchInsituPoints: async (datasetId) => {
    set({ isLoadingInsitu: true });
    try {
      const params = new URLSearchParams({ dataset_id: datasetId });
      const resp = await fetch(`${API_BASE}/api/v1/insitu/points?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      set({ insituData: data, isLoadingInsitu: false });
    } catch (err) {
      console.warn('Failed to fetch in-situ points:', err);
      set({ isLoadingInsitu: false });
    }
  },
}));