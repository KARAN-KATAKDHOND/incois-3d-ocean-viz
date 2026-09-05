// === Ocean Visualization Global Store ===
// Zustand store for managing all visualization state.

import { create } from 'zustand';
import type {
  VariableType, VisualizationMode,
  AppMode, LayerState, ColorbarConfig, ProbeData,
  DatasetMetadata, Observation, CrossSectionConfig
} from '../types/ocean';

interface OceanState {
  // App mode
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Dataset
  datasetId: string;
  datasetMeta: DatasetMetadata | null;
  setDatasetId: (id: string) => void;
  setDatasetMeta: (meta: DatasetMetadata | null) => void;

  // Variable & Viz Mode
  variable: VariableType;
  vizMode: VisualizationMode;
  setVariable: (v: VariableType) => void;
  setVizMode: (m: VisualizationMode) => void;

  // Depth
  depthIndex: number;
  setDepthIndex: (i: number) => void;

  // Time
  timeIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  setTimeIndex: (i: number) => void;
  setIsPlaying: (p: boolean) => void;
  setPlaybackSpeed: (s: number) => void;

  // Colorbar
  colorbar: ColorbarConfig;
  setColorbar: (c: Partial<ColorbarConfig>) => void;

  // Layers
  modelLayers: Record<string, LayerState>;
  obsLayers: Record<string, LayerState>;
  setModelLayer: (name: string, state: Partial<LayerState>) => void;
  setObsLayer: (name: string, state: Partial<LayerState>) => void;

  // Vertical exaggeration
  verticalExaggeration: number;
  setVerticalExaggeration: (v: number) => void;

  // Isosurface
  isoThreshold: number;
  isoEnabled: boolean;
  setIsoThreshold: (t: number) => void;
  setIsoEnabled: (e: boolean) => void;

  // Current particles
  particleDensity: number;
  particleSpeed: number;
  setParticleDensity: (d: number) => void;
  setParticleSpeed: (s: number) => void;

  // Selected observation
  selectedObservation: Observation | null;
  setSelectedObservation: (o: Observation | null) => void;

  // Probe
  probeData: ProbeData | null;
  probeEnabled: boolean;
  setProbeData: (p: ProbeData | null) => void;
  setProbeEnabled: (e: boolean) => void;

  // Cross-section
  crossSection: CrossSectionConfig;
  setCrossSection: (c: Partial<CrossSectionConfig>) => void;

  // UI state
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
  setLeftSidebarOpen: (o: boolean) => void;
  setRightPanelOpen: (o: boolean) => void;

  // Loading
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, msg?: string) => void;

  // Active page/view
  activePage: string;
  setActivePage: (page: string) => void;
}

export const useOceanStore = create<OceanState>((set) => ({
  // App mode
  appMode: 'professional',
  setAppMode: (mode) => set({ appMode: mode }),

  // Dataset
  datasetId: 'north-indian-ocean-demo',
  datasetMeta: null,
  setDatasetId: (id) => set({ datasetId: id }),
  setDatasetMeta: (meta) => set({ datasetMeta: meta }),

  // Variable & Viz Mode
  variable: 'temperature',
  vizMode: 'depth_slice',
  setVariable: (v) => set({ variable: v }),
  setVizMode: (m) => set({ vizMode: m }),

  // Depth
  depthIndex: 0,
  setDepthIndex: (i) => set({ depthIndex: i }),

  // Time
  timeIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  setTimeIndex: (i) => set({ timeIndex: i }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setPlaybackSpeed: (s) => set({ playbackSpeed: s }),

  // Colorbar
  colorbar: {
    colormap: 'turbo',
    min: 2,
    max: 32,
    scale: 'linear',
    reversed: false,
  },
  setColorbar: (c) => set((s) => ({ colorbar: { ...s.colorbar, ...c } })),

  // Layers
  modelLayers: {
    temperature: { visible: true, opacity: 0.8 },
    salinity: { visible: false, opacity: 0.8 },
    currents: { visible: false, opacity: 0.8 }
  },
  obsLayers: {
    argo: { visible: true, opacity: 1 },
    glider: { visible: true, opacity: 1 },
    ctd: { visible: false, opacity: 1 },
    bgc: { visible: false, opacity: 1 },
  },
  setModelLayer: (name, state) =>
    set((s) => ({
      modelLayers: {
        ...s.modelLayers,
        [name]: { ...s.modelLayers[name], ...state },
      },
    })),
  setObsLayer: (name, state) =>
    set((s) => ({
      obsLayers: {
        ...s.obsLayers,
        [name]: { ...s.obsLayers[name], ...state },
      },
    })),

  // Vertical exaggeration
  verticalExaggeration: 5,
  setVerticalExaggeration: (v) => set({ verticalExaggeration: v }),

  // Isosurface
  isoThreshold: 25,
  isoEnabled: false,
  setIsoThreshold: (t) => set({ isoThreshold: t }),
  setIsoEnabled: (e) => set({ isoEnabled: e }),

  // Current particles
  particleDensity: 500,
  particleSpeed: 1,
  setParticleDensity: (d) => set({ particleDensity: d }),
  setParticleSpeed: (s) => set({ particleSpeed: s }),

  // Selected observation
  selectedObservation: null,
  setSelectedObservation: (o) => set({ selectedObservation: o }),

  // Probe
  probeData: null,
  probeEnabled: false,
  setProbeData: (p) => set({ probeData: p }),
  setProbeEnabled: (e) => set({ probeEnabled: e }),

  // Cross-section
  crossSection: {
    enabled: false,
    lat1: 8, lon1: 70,
    lat2: 22, lon2: 85,
  },
  setCrossSection: (c) => set((s) => ({ crossSection: { ...s.crossSection, ...c } })),

  // UI state
  leftSidebarOpen: true,
  rightPanelOpen: true,
  setLeftSidebarOpen: (o) => set({ leftSidebarOpen: o }),
  setRightPanelOpen: (o) => set({ rightPanelOpen: o }),

  // Loading
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, msg = '') => set({ isLoading: loading, loadingMessage: msg }),

  // Active page
  activePage: 'explorer',
  setActivePage: (page) => set({ activePage: page }),
}));
