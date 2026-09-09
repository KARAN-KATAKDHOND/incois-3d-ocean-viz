"""
Ocean Intelligence — Trend Analysis Service

Multi-day trend detection, multi-parameter normalized overlays,
and spatial/temporal difference computation.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import xarray as xr

from .statistics import _open_zarr, _extract_time_series, get_variable_meta

logger = logging.getLogger(__name__)


def compute_trends(
    dataset_id: str,
    variables: list[str],
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute multi-day trends for multiple variables.

    Returns per-variable daily values, linear regression slope,
    direction, and normalized values for overlay charting.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    results = []
    all_times = None

    for var in variables:
        times, values = _extract_time_series(
            ds, var, start_idx, end_idx, lat, lon, depth
        )
        if len(values) == 0:
            continue

        if all_times is None:
            all_times = times

        # Linear fit
        x = np.arange(len(values), dtype=float)
        if len(values) > 1:
            coeffs = np.polyfit(x, values, 1)
            slope = float(coeffs[0])
            trend_line = (coeffs[0] * x + coeffs[1]).tolist()
        else:
            slope = 0.0
            trend_line = values.tolist()

        # Normalize to [0, 1] for overlay
        vmin, vmax = float(np.min(values)), float(np.max(values))
        if vmax - vmin > 1e-10:
            normalized = ((values - vmin) / (vmax - vmin)).tolist()
        else:
            normalized = [0.5] * len(values)

        meta = get_variable_meta(var)

        results.append({
            "variable": var,
            "display_name": meta["display"],
            "unit": meta["unit"],
            "values": [round(float(v), 4) for v in values],
            "normalized": [round(v, 4) for v in normalized],
            "trend_line": [round(v, 4) for v in trend_line],
            "slope": round(slope, 6),
            "direction": "increasing" if slope > 1e-6 else ("decreasing" if slope < -1e-6 else "stable"),
            "first_value": round(float(values[0]), 4),
            "last_value": round(float(values[-1]), 4),
            "delta": round(float(values[-1] - values[0]), 4),
            "pct_change": round(float((values[-1] - values[0]) / abs(values[0]) * 100) if abs(values[0]) > 1e-10 else 0.0, 2),
            "min": round(float(np.min(values)), 4),
            "max": round(float(np.max(values)), 4),
        })

    ds.close()

    if not results:
        return None

    return {
        "times": [str(t) for t in all_times] if all_times is not None else [],
        "trends": results,
        "n_time_steps": len(all_times) if all_times is not None else 0,
    }


def compute_difference(
    dataset_id: str,
    variable: str,
    time_idx_a: int = 0,
    time_idx_b: int = 6,
    depth: Optional[float] = None,
    depth_index: Optional[int] = None,
) -> Optional[dict]:
    """
    Compute the difference between two time steps for a variable.

    Returns:
    - KPI delta (regional mean difference)
    - Spatial 2D difference grid if applicable
    - Per-depth difference if applicable
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    # Handle derived variable
    if variable == "current_speed":
        u_var = "u" if "u" in ds.data_vars else ("uo" if "uo" in ds.data_vars else None)
        v_var = "v" if "v" in ds.data_vars else ("vo" if "vo" in ds.data_vars else None)
        if u_var is None or v_var is None:
            ds.close()
            return None
        speed = np.sqrt(ds[u_var] ** 2 + ds[v_var] ** 2)
        speed.name = "current_speed"
        ds = ds.assign(current_speed=speed)

    if variable not in ds.data_vars:
        ds.close()
        return None

    n_times = len(ds.time) if "time" in ds.coords else 0
    if n_times == 0:
        ds.close()
        return None

    time_idx_a = min(max(0, time_idx_a), n_times - 1)
    time_idx_b = min(max(0, time_idx_b), n_times - 1)

    slice_a = ds[variable].isel(time=time_idx_a)
    slice_b = ds[variable].isel(time=time_idx_b)

    # Select depth
    if "depth" in slice_a.dims:
        if depth_index is not None:
            n_depths = len(ds.depth)
            di = min(depth_index, n_depths - 1)
            slice_a = slice_a.isel(depth=di)
            slice_b = slice_b.isel(depth=di)
        elif depth is not None:
            slice_a = slice_a.sel(depth=depth, method="nearest")
            slice_b = slice_b.sel(depth=depth, method="nearest")
        else:
            slice_a = slice_a.isel(depth=0)
            slice_b = slice_b.isel(depth=0)

    diff = slice_b - slice_a

    vals_a = np.nan_to_num(slice_a.values.flatten(), nan=0.0)
    vals_b = np.nan_to_num(slice_b.values.flatten(), nan=0.0)
    vals_diff = np.nan_to_num(diff.values.flatten(), nan=0.0)

    meta = get_variable_meta(variable)
    time_a = str(ds.time.isel(time=time_idx_a).values)
    time_b = str(ds.time.isel(time=time_idx_b).values)

    lats = ds.lat.values.tolist() if "lat" in ds.coords else []
    lons = ds.lon.values.tolist() if "lon" in ds.coords else []

    ds.close()

    return {
        "variable": variable,
        "display_name": meta["display"],
        "unit": meta["unit"],
        "time_a": time_a,
        "time_b": time_b,
        "time_idx_a": time_idx_a,
        "time_idx_b": time_idx_b,
        "mean_a": round(float(np.mean(vals_a)), 4),
        "mean_b": round(float(np.mean(vals_b)), 4),
        "mean_diff": round(float(np.mean(vals_diff)), 4),
        "max_diff": round(float(np.max(vals_diff)), 4),
        "min_diff": round(float(np.min(vals_diff)), 4),
        "std_diff": round(float(np.std(vals_diff)), 4),
        "shape": list(diff.values.shape) if hasattr(diff.values, "shape") else [],
        "data_a": [round(float(v), 4) for v in vals_a[:2000]],
        "data_b": [round(float(v), 4) for v in vals_b[:2000]],
        "diff": [round(float(v), 4) for v in vals_diff[:2000]],
        "lats": [round(v, 4) for v in lats],
        "lons": [round(v, 4) for v in lons],
    }
