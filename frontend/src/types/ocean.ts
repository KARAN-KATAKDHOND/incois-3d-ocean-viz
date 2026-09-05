// === Ocean Data Visualization Types ===

export type VariableType = 'temperature' | 'salinity' | 'currents';
export type InstrumentType = 'argo' | 'glider' | 'ctd' | 'bgc';
export type QualityFlag = 'valid' | 'suspect' | 'missing' | 'interpolated';
export type VisualizationMode = 'volume' | 'depth_slice' | 'isosurface' | 'currents';
export type ScaleType = 'linear' | 'logarithmic';
export type ColormapName = 'viridis' | 'plasma' | 'inferno' | 'turbo' | 'coolwarm' | 'ocean';
export type AppMode = 'professional' | 'explore';

export interface SpatialExtent {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

export interface VariableInfo {
  name: VariableType;
  display_name: string;
  unit: string;
  min_value: number;
  max_value: number;
  description: string;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  source: string;
  variables: VariableInfo[];
  spatial_extent: SpatialExtent;
  time_start: string;
  time_end: string;
  depth_min: number;
  depth_max: number;
  depth_levels: number[];
  time_steps: string[];
  is_demo: boolean;
  status: string;
}

export interface DatasetListItem {
  id: string;
  name: string;
  description: string;
  source: string;
  variable_count: number;
  is_demo: boolean;
  status: string;
}

// === Model Data Types ===

export interface VolumeData {
  variable: string;
  unit: string;
  shape: number[];
  data: number[];
  lat_range: number[];
  lon_range: number[];
  depth_range: number[];
  min_value: number;
  max_value: number;
  time: string;
}

export interface SliceData {
  variable: string;
  unit: string;
  depth: number;
  shape: number[];
  data: number[];
  lat_range: number[];
  lon_range: number[];
  min_value: number;
  max_value: number;
  time: string;
}

export interface CurrentsData {
  shape: number[];
  u: number[];
  v: number[];
  speed: number[];
  lat_range: number[];
  lon_range: number[];
  depth: number;
  min_speed: number;
  max_speed: number;
  time: string;
}

export interface IsosurfaceData {
  variable: string;
  unit: string;
  threshold: number;
  vertices: number[];
  normals: number[];
  indices: number[];
  vertex_count: number;
}

export interface CrossSectionData {
  variable: string;
  unit: string;
  shape: number[];
  data: number[];
  distances: number[];
  depths: number[];
  min_value: number;
  max_value: number;
  start_point: number[];
  end_point: number[];
}

// === Observation Types ===

export interface Observation {
  id: string;
  instrument_type: InstrumentType;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  data_source: string;
  quality: QualityFlag;
  variables: string[];
  platform_id: string;
}

export interface ProfilePoint {
  depth: number;
  value: number;
  quality: QualityFlag;
}

export interface ProfileData {
  observation_id: string;
  instrument_type: string;
  variable: string;
  unit: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  profile: ProfilePoint[];
}

// === Comparison Types ===

export interface ComparisonData {
  observation_id: string;
  variable: string;
  unit: string;
  rmse: number;
  bias: number;
  correlation: number;
  n_observations: number;
  model_profile: ProfilePoint[];
  observation_profile: ProfilePoint[];
  is_demo: boolean;
}

// === Visualization State Types ===

export interface ColorbarConfig {
  colormap: ColormapName;
  min: number;
  max: number;
  scale: ScaleType;
  reversed: boolean;
}

export interface LayerState {
  visible: boolean;
  opacity: number;
}

export interface ProbeData {
  latitude: number;
  longitude: number;
  depth: number;
  variable: string;
  value: number;
  unit: string;
  time: string;
}

export interface CrossSectionConfig {
  enabled: boolean;
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
}
