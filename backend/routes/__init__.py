"""
Ocean Intelligence — Analysis API Router

All endpoints for the Ocean Intelligence dashboard.
Each endpoint performs lazy Zarr-backed computation and returns
summarized JSON for frontend consumption.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from typing import Optional

from services.analysis.statistics import compute_summary, compute_kpi_cards
from services.analysis.correlation import (
    compute_correlation,
    compute_correlation_matrix,
    compute_lagged_correlation,
)
from services.analysis.trend_analysis import compute_trends, compute_difference
from services.analysis.anomaly import detect_anomalies, compute_spatial_anomaly
from services.analysis.water_column import (
    compute_depth_profile,
    compute_depth_time_heatmap,
    compute_ts_diagram,
)
from services.analysis.inference_engine import generate_inference
from services.analysis.data_quality import compute_data_quality

router = APIRouter(tags=["analysis"])


@router.get("/summary")
async def get_summary(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get summary statistics and KPI card data."""
    cards = compute_kpi_cards(dataset_id, start_idx, end_idx, lat, lon, depth)
    if cards is None:
        return {"error": "Dataset not found or no data available", "cards": [], "global_anomaly_score": 0}
    return cards


@router.get("/trends")
async def get_trends(
    dataset_id: str = "noaa_sst_real",
    variables: str = "temperature,salinity,current_speed",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get multi-day trend data for multiple variables."""
    var_list = [v.strip() for v in variables.split(",") if v.strip()]
    result = compute_trends(dataset_id, var_list, start_idx, end_idx, lat, lon, depth)
    if result is None:
        return {"error": "No trend data available", "times": [], "trends": []}
    return result


@router.get("/correlation")
async def get_correlation(
    dataset_id: str = "noaa_sst_real",
    variable_a: str = "temperature",
    variable_b: str = "salinity",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get pairwise correlation analysis between two variables."""
    result = compute_correlation(
        dataset_id, variable_a, variable_b, start_idx, end_idx, lat, lon, depth
    )
    if result is None:
        return {"error": "Insufficient data for correlation analysis"}
    return result


@router.get("/correlation-matrix")
async def get_correlation_matrix(
    dataset_id: str = "noaa_sst_real",
    variables: str = "temperature,salinity,current_speed",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get NxN correlation matrix for selected variables."""
    var_list = [v.strip() for v in variables.split(",") if v.strip()]
    result = compute_correlation_matrix(
        dataset_id, var_list, start_idx, end_idx, lat, lon, depth
    )
    if result is None:
        return {"error": "Insufficient data for correlation matrix"}
    return result


@router.get("/lagged")
async def get_lagged_correlation(
    dataset_id: str = "noaa_sst_real",
    variable_a: str = "temperature",
    variable_b: str = "salinity",
    max_lag: int = 5,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get lagged cross-correlation analysis."""
    result = compute_lagged_correlation(
        dataset_id, variable_a, variable_b, max_lag,
        start_idx, end_idx, lat, lon, depth
    )
    if result is None:
        return {"error": "Insufficient data for lagged analysis"}
    return result


@router.get("/anomaly")
async def get_anomaly(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get anomaly detection results."""
    result = detect_anomalies(
        dataset_id, variable, start_idx, end_idx, lat, lon, depth
    )
    if result is None:
        return {"error": "Insufficient data for anomaly detection"}
    return result


@router.get("/spatial-anomaly")
async def get_spatial_anomaly(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    time_idx: int = -1,
    depth_index: int = 0,
):
    """Get spatial anomaly map data."""
    result = compute_spatial_anomaly(dataset_id, variable, time_idx, depth_index)
    if result is None:
        return {"error": "Spatial anomaly data not available"}
    return result


@router.get("/depth-profile")
async def get_depth_profile(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    time_indices: str = "0,3,6",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    """Get depth profiles for multiple time steps."""
    indices = [int(i.strip()) for i in time_indices.split(",") if i.strip()]
    result = compute_depth_profile(dataset_id, variable, indices, lat, lon)
    if result is None:
        return {"error": "Depth profile data not available"}
    return result


@router.get("/heatmap")
async def get_heatmap(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    """Get depth × time heatmap data."""
    result = compute_depth_time_heatmap(
        dataset_id, variable, start_idx, end_idx, lat, lon
    )
    if result is None:
        return {"error": "Heatmap data not available"}
    return result


@router.get("/difference")
async def get_difference(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    time_idx_a: int = 0,
    time_idx_b: int = 6,
    depth: Optional[float] = None,
    depth_index: Optional[int] = None,
):
    """Get day-to-day difference analysis."""
    result = compute_difference(
        dataset_id, variable, time_idx_a, time_idx_b, depth, depth_index
    )
    if result is None:
        return {"error": "Difference data not available"}
    return result


@router.get("/inference")
async def get_inference(
    dataset_id: str = "noaa_sst_real",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
):
    """Get generated scientific inferences."""
    result = generate_inference(
        dataset_id, start_idx, end_idx, lat, lon, depth
    )
    if result is None:
        return {"error": "Inference generation failed", "primary_insight": None, "discovered_relationships": []}
    return result


@router.get("/data-quality")
async def get_data_quality(
    dataset_id: str = "noaa_sst_real",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
):
    """Get dataset quality and methodology information."""
    result = compute_data_quality(dataset_id, start_idx, end_idx)
    if result is None:
        return {"error": "Dataset not found"}
    return result


@router.get("/ts-diagram")
async def get_ts_diagram(
    dataset_id: str = "noaa_sst_real",
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    """Get Temperature-Salinity diagram data."""
    result = compute_ts_diagram(dataset_id, start_idx, end_idx, lat, lon)
    if result is None:
        return {"error": "T-S diagram data not available"}
    return result
