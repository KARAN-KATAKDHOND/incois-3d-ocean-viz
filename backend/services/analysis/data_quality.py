"""
Ocean Intelligence — Data Quality Service

Reports dataset quality metrics: observation counts, missing data,
coverage statistics, resolution, and metadata transparency.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np

from .statistics import _open_zarr, get_variable_meta

logger = logging.getLogger(__name__)


def compute_data_quality(
    dataset_id: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
) -> Optional[dict]:
    """
    Compute comprehensive data quality metrics for a dataset.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    variables = list(ds.data_vars)
    n_vars = len(variables)

    # Dimensions
    n_time = len(ds.time) if "time" in ds.coords else 0
    n_depth = len(ds.depth) if "depth" in ds.coords else 0
    n_lat = len(ds.lat) if "lat" in ds.coords else 0
    n_lon = len(ds.lon) if "lon" in ds.coords else 0

    # Total observations
    total_obs = n_time * n_depth * n_lat * n_lon * n_vars if n_vars > 0 else 0

    # Time range
    time_start = str(ds.time.values[0]) if n_time > 0 else ""
    time_end = str(ds.time.values[-1]) if n_time > 0 else ""
    time_steps = [str(t) for t in ds.time.values] if n_time > 0 else []

    # Spatial bounds
    lat_min = float(ds.lat.min()) if n_lat > 0 else 0
    lat_max = float(ds.lat.max()) if n_lat > 0 else 0
    lon_min = float(ds.lon.min()) if n_lon > 0 else 0
    lon_max = float(ds.lon.max()) if n_lon > 0 else 0

    # Depth range
    depth_min = float(ds.depth.min()) if n_depth > 0 else 0
    depth_max = float(ds.depth.max()) if n_depth > 0 else 0
    depth_levels = [round(float(d), 2) for d in ds.depth.values] if n_depth > 0 else []

    # Resolution
    lat_res = round(float(np.mean(np.diff(ds.lat.values))), 4) if n_lat > 1 else 0
    lon_res = round(float(np.mean(np.diff(ds.lon.values))), 4) if n_lon > 1 else 0

    # Per-variable quality
    var_quality = []
    total_missing = 0
    total_points = 0
    for var in variables:
        da = ds[var]
        size = int(da.size)
        # Sample NaN count (for large datasets, sample rather than full scan)
        if size > 1_000_000:
            # Sample 10k points
            sample = da.values.flatten()[:10000]
            nan_count = int(np.isnan(sample).sum())
            nan_pct = round(nan_count / len(sample) * 100, 2)
            estimated = True
        else:
            nan_count = int(np.isnan(da.values).sum())
            nan_pct = round(nan_count / size * 100, 2) if size > 0 else 0
            estimated = False

        total_missing += nan_count
        total_points += size

        meta = get_variable_meta(var)
        var_quality.append({
            "variable": var,
            "display_name": meta["display"],
            "unit": meta["unit"],
            "total_points": size,
            "missing_count": nan_count,
            "missing_pct": nan_pct,
            "estimated": estimated,
        })

    overall_missing_pct = round(total_missing / total_points * 100, 2) if total_points > 0 else 0

    ds.close()

    return {
        "dataset_id": dataset_id,
        "total_observations": total_obs,
        "total_variables": n_vars,
        "variables": [v["variable"] for v in var_quality],
        "variable_quality": var_quality,
        "overall_missing_pct": overall_missing_pct,
        "spatial_coverage": {
            "lat_min": round(lat_min, 2),
            "lat_max": round(lat_max, 2),
            "lon_min": round(lon_min, 2),
            "lon_max": round(lon_max, 2),
            "n_lat": n_lat,
            "n_lon": n_lon,
            "lat_resolution": lat_res,
            "lon_resolution": lon_res,
        },
        "temporal_coverage": {
            "start": time_start,
            "end": time_end,
            "n_time_steps": n_time,
            "time_steps": time_steps[:50],  # Limit response size
        },
        "depth_coverage": {
            "min": round(depth_min, 2),
            "max": round(depth_max, 2),
            "n_levels": n_depth,
            "levels": depth_levels,
        },
        "methodology": {
            "correlation": "Pearson product-moment correlation coefficient computed on spatially averaged time series. Spearman rank correlation computed for robustness against non-linear relationships.",
            "anomaly": "Z-score anomaly detection: (observed - period_mean) / period_std. Thresholds: |Z| < 1 = Normal, 1 ≤ |Z| < 2 = Moderate anomaly, |Z| ≥ 2 = Significant anomaly.",
            "trends": "Linear regression (OLS) slope fitted to daily-mean time series. Direction classified as increasing/decreasing/stable based on slope magnitude.",
            "missing_values": "NaN values are excluded from statistical computations. Missing data percentage is reported per variable.",
            "confidence": "Confidence scoring combines observation count, statistical signal strength (|r|), and trend consistency. HIGH = strong evidence + sufficient data; MEDIUM = moderate evidence; LOW = weak signal or sparse data.",
            "inference": "Scientific interpretations are generated from rule-based templates matched to observed statistical patterns. All interpretations are hedged hypotheses, not confirmed causal claims.",
        },
    }
