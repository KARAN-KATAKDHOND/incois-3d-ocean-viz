"""
Ocean Intelligence — Core Statistics Service

Provides summary statistics, KPI computation, and time-series extraction
from Zarr-backed Xarray datasets. All operations use lazy evaluation
and never load full datasets into memory.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import xarray as xr

logger = logging.getLogger(__name__)

ZARR_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "zarr_stores"

# Human-readable variable display names and units
VARIABLE_META = {
    "temperature": {"display": "Temperature", "unit": "°C"},
    "salinity": {"display": "Salinity", "unit": "PSU"},
    "u": {"display": "Zonal Velocity (U)", "unit": "m/s"},
    "v": {"display": "Meridional Velocity (V)", "unit": "m/s"},
    "current_speed": {"display": "Current Speed", "unit": "m/s"},
    "thetao": {"display": "Potential Temperature", "unit": "°C"},
    "so": {"display": "Salinity", "unit": "PSU"},
    "uo": {"display": "Zonal Velocity (U)", "unit": "m/s"},
    "vo": {"display": "Meridional Velocity (V)", "unit": "m/s"},
    "zos": {"display": "Sea Surface Height", "unit": "m"},
    "mlotst": {"display": "Mixed Layer Depth", "unit": "m"},
    "bottomT": {"display": "Bottom Temperature", "unit": "°C"},
    "siconc": {"display": "Sea Ice Concentration", "unit": "fraction"},
    "sithick": {"display": "Sea Ice Thickness", "unit": "m"},
}


def _open_zarr(dataset_id: str) -> Optional[xr.Dataset]:
    """Open a Zarr store lazily."""
    zarr_path = ZARR_DIR / f"{dataset_id}.zarr"
    if not zarr_path.exists():
        return None
    try:
        return xr.open_zarr(str(zarr_path), consolidated=True)
    except Exception as e:
        logger.error(f"Failed to open zarr {dataset_id}: {e}")
        return None


def get_variable_meta(var_name: str) -> dict:
    """Return display name and unit for a variable."""
    meta = VARIABLE_META.get(var_name, {"display": var_name.title(), "unit": ""})
    return {"name": var_name, **meta}


def _extract_time_series(
    ds: xr.Dataset,
    variable: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Extract a 1D time series for a variable, optionally at a specific point
    or averaged over a region/depth range.

    Returns (times, values) arrays.
    """
    if variable not in ds.data_vars:
        # Handle derived variables
        if variable == "current_speed" and "u" in ds.data_vars and "v" in ds.data_vars:
            u = ds["u"]
            v = ds["v"]
            da = np.sqrt(u ** 2 + v ** 2)
            da.name = "current_speed"
        elif variable == "current_speed" and "uo" in ds.data_vars and "vo" in ds.data_vars:
            u = ds["uo"]
            v = ds["vo"]
            da = np.sqrt(u ** 2 + v ** 2)
            da.name = "current_speed"
        else:
            return np.array([]), np.array([])
    else:
        da = ds[variable]

    # Time slicing
    if "time" not in da.dims:
        return np.array([]), np.array([])

    n_times = len(ds.time)
    end_idx = end_idx if end_idx is not None else n_times
    end_idx = min(end_idx, n_times)
    start_idx = max(0, start_idx)
    da = da.isel(time=slice(start_idx, end_idx))

    # Spatial selection
    if lat is not None and "lat" in da.dims:
        da = da.sel(lat=lat, method="nearest")
    if lon is not None and "lon" in da.dims:
        da = da.sel(lon=lon, method="nearest")

    # Depth selection
    if "depth" in da.dims:
        if depth is not None:
            da = da.sel(depth=depth, method="nearest")
        elif depth_min is not None or depth_max is not None:
            d_min = depth_min if depth_min is not None else 0
            d_max = depth_max if depth_max is not None else 99999
            da = da.sel(depth=slice(d_min, d_max)).mean(dim="depth")
        else:
            da = da.isel(depth=0)

    # Average remaining spatial dims
    for dim in ["lat", "lon"]:
        if dim in da.dims:
            da = da.mean(dim=dim)

    times = ds.time.isel(time=slice(start_idx, end_idx)).values
    values = da.values.flatten()

    # Handle NaN
    values = np.nan_to_num(values, nan=0.0)

    return times, values


def compute_summary(
    dataset_id: str,
    variable: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute summary statistics for a single variable over a time range.

    Returns: mean, median, std, min, max, trend_slope, pct_change,
             first_value, last_value, values, times
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    times, values = _extract_time_series(
        ds, variable, start_idx, end_idx, lat, lon, depth
    )
    ds.close()

    if len(values) == 0:
        return None

    mean_val = float(np.mean(values))
    median_val = float(np.median(values))
    std_val = float(np.std(values))
    min_val = float(np.min(values))
    max_val = float(np.max(values))
    first_val = float(values[0])
    last_val = float(values[-1])
    delta = last_val - first_val
    pct_change = (delta / abs(first_val) * 100) if abs(first_val) > 1e-10 else 0.0

    # Linear trend slope (units per day)
    if len(values) > 1:
        x = np.arange(len(values), dtype=float)
        coeffs = np.polyfit(x, values, 1)
        trend_slope = float(coeffs[0])
    else:
        trend_slope = 0.0

    # Determine trend direction
    if abs(trend_slope) < 1e-6:
        trend_direction = "stable"
    elif trend_slope > 0:
        trend_direction = "increasing"
    else:
        trend_direction = "decreasing"

    meta = get_variable_meta(variable)

    return {
        "variable": variable,
        "display_name": meta["display"],
        "unit": meta["unit"],
        "mean": round(mean_val, 4),
        "median": round(median_val, 4),
        "std": round(std_val, 4),
        "min": round(min_val, 4),
        "max": round(max_val, 4),
        "first_value": round(first_val, 4),
        "last_value": round(last_val, 4),
        "delta": round(delta, 4),
        "pct_change": round(pct_change, 2),
        "trend_slope": round(trend_slope, 6),
        "trend_direction": trend_direction,
        "n_observations": len(values),
        "times": [str(t) for t in times],
        "values": [round(float(v), 4) for v in values],
    }


def compute_kpi_cards(
    dataset_id: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute KPI card data for all available variables.
    Returns a list of KPI card objects for the dashboard header.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    available_vars = list(ds.data_vars)
    # Add derived current_speed if u/v exist
    if ("u" in available_vars and "v" in available_vars) or \
       ("uo" in available_vars and "vo" in available_vars):
        available_vars.append("current_speed")

    ds.close()

    cards = []
    for var in available_vars:
        summary = compute_summary(dataset_id, var, start_idx, end_idx, lat, lon, depth)
        if summary is None:
            continue

        # Determine anomaly score (simple z-score of the last value)
        if summary["std"] > 1e-10:
            anomaly_z = abs(summary["last_value"] - summary["mean"]) / summary["std"]
        else:
            anomaly_z = 0.0

        if anomaly_z > 2.0:
            anomaly_status = "significant"
        elif anomaly_z > 1.0:
            anomaly_status = "moderate"
        else:
            anomaly_status = "normal"

        cards.append({
            "variable": summary["variable"],
            "display_name": summary["display_name"],
            "unit": summary["unit"],
            "current_value": summary["last_value"],
            "delta": summary["delta"],
            "pct_change": summary["pct_change"],
            "trend_direction": summary["trend_direction"],
            "trend_slope": summary["trend_slope"],
            "anomaly_z": round(anomaly_z, 2),
            "anomaly_status": anomaly_status,
            "sparkline": summary["values"][-min(7, len(summary["values"])):],
        })

    # Compute a global anomaly score
    z_scores = [c["anomaly_z"] for c in cards if c["anomaly_z"] > 0]
    global_anomaly = round(float(np.mean(z_scores)), 2) if z_scores else 0.0
    if global_anomaly > 2.0:
        global_status = "significant"
    elif global_anomaly > 1.0:
        global_status = "moderate"
    else:
        global_status = "normal"

    return {
        "cards": cards,
        "global_anomaly_score": global_anomaly,
        "global_anomaly_status": global_status,
        "dataset_id": dataset_id,
        "n_time_steps": end_idx - start_idx if end_idx else 0,
    }
