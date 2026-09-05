// === API Service Layer ===
// Centralized API client for the Ocean Visualization backend.
// Architecture supports future OPeNDAP endpoint replacement.

import type {
  DatasetMetadata, DatasetListItem, VolumeData, SliceData,
  CurrentsData, IsosurfaceData, CrossSectionData,
  Observation, ProfileData, ComparisonData,
  VariableType, InstrumentType, QualityFlag
} from '../types/ocean';

const API_BASE = '/api';

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// === Dataset API ===

export const datasetApi = {
  list: () => fetchJSON<DatasetListItem[]>(`${API_BASE}/datasets`),

  get: (id: string) => fetchJSON<DatasetMetadata>(`${API_BASE}/datasets/${id}`),

  getVariables: (id: string) => fetchJSON<any[]>(`${API_BASE}/datasets/${id}/variables`),

  getTimes: (id: string) => fetchJSON<string[]>(`${API_BASE}/datasets/${id}/times`),

  getDepths: (id: string) => fetchJSON<number[]>(`${API_BASE}/datasets/${id}/depths`),
};

// === Model Data API ===

export const modelApi = {
  getVolume: (params: {
    dataset_id?: string;
    variable?: VariableType;
    time_index?: number;
    resolution?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.dataset_id) qs.set('dataset_id', params.dataset_id);
    if (params.variable) qs.set('variable', params.variable);
    if (params.time_index !== undefined) qs.set('time_index', String(params.time_index));
    if (params.resolution) qs.set('resolution', String(params.resolution));
    return fetchJSON<VolumeData>(`${API_BASE}/model/volume?${qs}`);
  },

  getSlice: (params: {
    dataset_id?: string;
    variable?: VariableType;
    depth_index?: number;
    time_index?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.dataset_id) qs.set('dataset_id', params.dataset_id);
    if (params.variable) qs.set('variable', params.variable);
    if (params.depth_index !== undefined) qs.set('depth_index', String(params.depth_index));
    if (params.time_index !== undefined) qs.set('time_index', String(params.time_index));
    return fetchJSON<SliceData>(`${API_BASE}/model/slice?${qs}`);
  },

  getIsosurface: (params: {
    dataset_id?: string;
    variable?: VariableType;
    threshold?: number;
    time_index?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.dataset_id) qs.set('dataset_id', params.dataset_id);
    if (params.variable) qs.set('variable', params.variable);
    if (params.threshold !== undefined) qs.set('threshold', String(params.threshold));
    if (params.time_index !== undefined) qs.set('time_index', String(params.time_index));
    return fetchJSON<IsosurfaceData>(`${API_BASE}/model/isosurface?${qs}`);
  },

  getCurrents: (params: {
    dataset_id?: string;
    time_index?: number;
    depth_index?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.dataset_id) qs.set('dataset_id', params.dataset_id);
    qs.set('variable', 'currents');
    if (params.time_index !== undefined) qs.set('time_index', String(params.time_index));
    if (params.depth_index !== undefined) qs.set('depth_index', String(params.depth_index));
    return fetchJSON<CurrentsData>(`${API_BASE}/model/slice?${qs}`);
  },

  getCrossSection: (params: {
    dataset_id?: string;
    variable?: VariableType;
    lat1: number; lon1: number;
    lat2: number; lon2: number;
    time_index?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.dataset_id) qs.set('dataset_id', params.dataset_id);
    if (params.variable) qs.set('variable', params.variable);
    qs.set('lat1', String(params.lat1));
    qs.set('lon1', String(params.lon1));
    qs.set('lat2', String(params.lat2));
    qs.set('lon2', String(params.lon2));
    if (params.time_index !== undefined) qs.set('time_index', String(params.time_index));
    return fetchJSON<CrossSectionData>(`${API_BASE}/model/crosssection?${qs}`);
  },
};

// === Observation API ===

export const observationApi = {
  list: (params: {
    instrument_type?: InstrumentType;
    variable?: string;
    lat_min?: number;
    lat_max?: number;
    lon_min?: number;
    lon_max?: number;
    depth_min?: number;
    depth_max?: number;
    quality?: QualityFlag;
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        qs.set(key, String(val));
      }
    });
    return fetchJSON<Observation[]>(`${API_BASE}/observations?${qs}`);
  },

  get: (id: string) => fetchJSON<Observation>(`${API_BASE}/observations/${id}`),

  getProfile: (id: string, variable: VariableType = 'temperature') =>
    fetchJSON<ProfileData>(`${API_BASE}/observations/${id}/profile?variable=${variable}`),
};

// === Comparison API ===

export const comparisonApi = {
  compare: (params: {
    dataset_id?: string;
    observation_id: string;
    variable?: VariableType;
    time_index?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.dataset_id) qs.set('dataset_id', params.dataset_id);
    qs.set('observation_id', params.observation_id);
    if (params.variable) qs.set('variable', params.variable);
    if (params.time_index !== undefined) qs.set('time_index', String(params.time_index));
    return fetchJSON<ComparisonData>(`${API_BASE}/compare?${qs}`);
  },
};

// === Health ===

export const healthApi = {
  check: () => fetchJSON<{ status: string; mode: string }>(`${API_BASE}/health`),
};
