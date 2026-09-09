// === Ocean Intelligence Analysis API Client ===

import type {
  SummaryResponse, TrendsResponse, CorrelationResult,
  CorrelationMatrixResponse, AnomalyResponse, DepthProfileResponse,
  HeatmapResponse, TSDiagramResponse, DifferenceResponse,
  InferenceResponse, DataQualityResponse, LaggedResponse,
} from '../types/intelligence';

const API_BASE = '/api/analysis';

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function buildQS(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      qs.set(key, String(val));
    }
  });
  return qs.toString();
}

export interface AnalysisParams {
  dataset_id?: string;
  start_idx?: number;
  end_idx?: number;
  lat?: number;
  lon?: number;
  depth?: number;
}

export const analysisApi = {
  getSummary: (params: AnalysisParams = {}) =>
    fetchJSON<SummaryResponse>(`${API_BASE}/summary?${buildQS(params as any)}`),

  getTrends: (params: AnalysisParams & { variables?: string } = {}) =>
    fetchJSON<TrendsResponse>(`${API_BASE}/trends?${buildQS(params as any)}`),

  getCorrelation: (params: AnalysisParams & { variable_a?: string; variable_b?: string } = {}) =>
    fetchJSON<CorrelationResult>(`${API_BASE}/correlation?${buildQS(params as any)}`),

  getCorrelationMatrix: (params: AnalysisParams & { variables?: string } = {}) =>
    fetchJSON<CorrelationMatrixResponse>(`${API_BASE}/correlation-matrix?${buildQS(params as any)}`),

  getLagged: (params: AnalysisParams & { variable_a?: string; variable_b?: string; max_lag?: number } = {}) =>
    fetchJSON<LaggedResponse>(`${API_BASE}/lagged?${buildQS(params as any)}`),

  getAnomaly: (params: AnalysisParams & { variable?: string } = {}) =>
    fetchJSON<AnomalyResponse>(`${API_BASE}/anomaly?${buildQS(params as any)}`),

  getDepthProfile: (params: AnalysisParams & { variable?: string; time_indices?: string } = {}) =>
    fetchJSON<DepthProfileResponse>(`${API_BASE}/depth-profile?${buildQS(params as any)}`),

  getHeatmap: (params: AnalysisParams & { variable?: string } = {}) =>
    fetchJSON<HeatmapResponse>(`${API_BASE}/heatmap?${buildQS(params as any)}`),

  getDifference: (params: AnalysisParams & { variable?: string; time_idx_a?: number; time_idx_b?: number; depth_index?: number } = {}) =>
    fetchJSON<DifferenceResponse>(`${API_BASE}/difference?${buildQS(params as any)}`),

  getInference: (params: AnalysisParams = {}) =>
    fetchJSON<InferenceResponse>(`${API_BASE}/inference?${buildQS(params as any)}`),

  getDataQuality: (params: { dataset_id?: string; start_idx?: number; end_idx?: number } = {}) =>
    fetchJSON<DataQualityResponse>(`${API_BASE}/data-quality?${buildQS(params as any)}`),

  getTSDiagram: (params: AnalysisParams = {}) =>
    fetchJSON<TSDiagramResponse>(`${API_BASE}/ts-diagram?${buildQS(params as any)}`),
};
