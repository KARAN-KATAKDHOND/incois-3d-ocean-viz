// === Ocean Intelligence Dashboard Types ===

export interface KPICard {
  variable: string;
  display_name: string;
  unit: string;
  current_value: number;
  delta: number;
  pct_change: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_slope: number;
  anomaly_z: number;
  anomaly_status: 'normal' | 'moderate' | 'significant';
  sparkline: number[];
}

export interface SummaryResponse {
  cards: KPICard[];
  global_anomaly_score: number;
  global_anomaly_status: 'normal' | 'moderate' | 'significant';
  dataset_id: string;
  n_time_steps: number;
}

export interface TrendItem {
  variable: string;
  display_name: string;
  unit: string;
  values: number[];
  normalized: number[];
  trend_line: number[];
  slope: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  first_value: number;
  last_value: number;
  delta: number;
  pct_change: number;
  min: number;
  max: number;
}

export interface TrendsResponse {
  times: string[];
  trends: TrendItem[];
  n_time_steps: number;
}

export interface CorrelationResult {
  variable_a: string;
  variable_b: string;
  display_a: string;
  display_b: string;
  unit_a: string;
  unit_b: string;
  pearson_r: number;
  spearman_r: number;
  spearman_p: number;
  covariance: number;
  strength: 'strong' | 'moderate' | 'weak' | 'negligible';
  direction: 'positive' | 'negative' | 'negligible';
  description: string;
  n_observations: number;
  values_a: number[];
  values_b: number[];
  mean_a: number;
  mean_b: number;
  std_a: number;
  std_b: number;
}

export interface CorrelationMatrixCell {
  row: number;
  col: number;
  variable_a: string;
  variable_b: string;
  value: number;
  strength: string;
  direction: string;
}

export interface CorrelationMatrixResponse {
  variables: string[];
  labels: { name: string; display: string; unit: string }[];
  matrix: number[][];
  cells: CorrelationMatrixCell[];
  n_observations: number;
}

export interface AnomalyDaily {
  time: string;
  time_index: number;
  observed: number;
  expected: number;
  difference: number;
  z_score: number;
  status: 'normal' | 'moderate' | 'significant';
  confidence: string;
}

export interface AnomalyResponse {
  variable: string;
  display_name: string;
  unit: string;
  period_mean: number;
  period_std: number;
  overall_status: string;
  overall_confidence: { level: string; reasons: string[] };
  n_significant: number;
  n_moderate: number;
  n_normal: number;
  most_anomalous: AnomalyDaily;
  daily: AnomalyDaily[];
}

export interface DepthProfileItem {
  time_index: number;
  time: string;
  values: number[];
}

export interface DepthProfileResponse {
  variable: string;
  display_name: string;
  unit: string;
  depths: number[];
  profiles: DepthProfileItem[];
  gradient_info: { depth: number; gradient: number; type: string } | null;
}

export interface HeatmapResponse {
  variable: string;
  display_name: string;
  unit: string;
  shape: number[];
  data: number[];
  depths: number[];
  times: string[];
  min_value: number;
  max_value: number;
}

export interface TSPoint {
  temperature: number;
  salinity: number;
  depth: number;
  time: string;
  time_index: number;
  depth_index: number;
}

export interface TSDiagramResponse {
  points: TSPoint[];
  n_points: number;
  contours: {
    t_grid: number[];
    s_grid: number[];
    density: number[][];
  } | null;
  temp_variable: string;
  sal_variable: string;
}

export interface DifferenceResponse {
  variable: string;
  display_name: string;
  unit: string;
  time_a: string;
  time_b: string;
  time_idx_a: number;
  time_idx_b: number;
  mean_a: number;
  mean_b: number;
  mean_diff: number;
  max_diff: number;
  min_diff: number;
  std_diff: number;
  shape: number[];
  data_a: number[];
  data_b: number[];
  diff: number[];
  lats: number[];
  lons: number[];
}

export interface InferenceRelationship {
  variable_a: string;
  variable_b: string;
  display_a: string;
  display_b: string;
  pearson_r: number;
  strength: string;
  direction: string;
  interpretation: string;
  investigations: string[];
}

export interface ChangeEvent {
  variable: string;
  display_name: string;
  unit: string;
  delta: number;
  pct_change: number;
  direction: string;
  description: string;
}

export interface PrimaryInsight {
  title: string;
  observation: string;
  statistical_evidence: string;
  relationship: {
    variables: string[];
    pearson_r: number;
    strength: string;
    direction: string;
  };
  interpretation: string;
  confidence: { level: string; score: number; reasons: string[] };
  recommended_investigation: string[];
  evidence_summary: string[];
}

export interface InferenceResponse {
  primary_insight: PrimaryInsight | null;
  discovered_relationships: InferenceRelationship[];
  change_events: ChangeEvent[];
  connections: {
    variables: string[];
    correlation: number;
    strength: string;
    description: string;
  }[];
  anomaly_summary: {
    variable: string;
    display_name: string;
    status: string;
    most_anomalous_day: string;
    peak_z_score: number;
  }[];
  dataset_id: string;
  is_demo: boolean;
}

export interface DataQualityResponse {
  dataset_id: string;
  total_observations: number;
  total_variables: number;
  variables: string[];
  variable_quality: {
    variable: string;
    display_name: string;
    unit: string;
    total_points: number;
    missing_count: number;
    missing_pct: number;
    estimated: boolean;
  }[];
  overall_missing_pct: number;
  spatial_coverage: {
    lat_min: number; lat_max: number;
    lon_min: number; lon_max: number;
    n_lat: number; n_lon: number;
    lat_resolution: number; lon_resolution: number;
  };
  temporal_coverage: {
    start: string; end: string;
    n_time_steps: number; time_steps: string[];
  };
  depth_coverage: {
    min: number; max: number;
    n_levels: number; levels: number[];
  };
  methodology: Record<string, string>;
}

export interface LaggedResponse {
  variable_a: string;
  variable_b: string;
  display_a: string;
  display_b: string;
  lags: { lag: number; correlation: number; strength: string; n_pairs: number }[];
  peak_lag: number;
  peak_correlation: number;
}

// Predefined regions
export interface OceanRegion {
  name: string;
  lat: number;
  lon: number;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

export const OCEAN_REGIONS: OceanRegion[] = [
  { name: 'Arabian Sea', lat: 15.0, lon: 67.0, lat_min: 8, lat_max: 22, lon_min: 60, lon_max: 75 },
  { name: 'Bay of Bengal', lat: 15.0, lon: 88.0, lat_min: 8, lat_max: 22, lon_min: 80, lon_max: 95 },
  { name: 'Lakshadweep Sea', lat: 10.0, lon: 73.0, lat_min: 8, lat_max: 14, lon_min: 70, lon_max: 78 },
  { name: 'Indian Ocean (North)', lat: 12.0, lon: 80.0, lat_min: 5, lat_max: 25, lon_min: 60, lon_max: 100 },
  { name: 'Andaman Sea', lat: 12.0, lon: 96.0, lat_min: 6, lat_max: 16, lon_min: 92, lon_max: 100 },
];

export const DATE_RANGE_PRESETS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];
