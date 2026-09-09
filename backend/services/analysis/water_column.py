"""
Ocean Intelligence — Water Column Analysis Service

Depth profiles, depth-time heatmaps, Temperature-Salinity diagrams,
and thermocline/halocline detection.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import xarray as xr

from .statistics import _open_zarr, get_variable_meta

logger = logging.getLogger(__name__)


def compute_depth_profile(
    dataset_id: str,
    variable: str,
    time_indices: list[int] | None = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Optional[dict]:
    """
    Extract vertical depth profiles for a variable across multiple days.

    Returns depth array + per-day profile values.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    # Handle derived variable
    if variable == "current_speed":
        u_var = "u" if "u" in ds.data_vars else ("uo" if "uo" in ds.data_vars else None)
        v_var = "v" if "v" in ds.data_vars else ("vo" if "vo" in ds.data_vars else None)
        if u_var and v_var:
            speed = np.sqrt(ds[u_var] ** 2 + ds[v_var] ** 2)
            speed.name = "current_speed"
            ds = ds.assign(current_speed=speed)

    if variable not in ds.data_vars:
        ds.close()
        return None

    da = ds[variable]

    if "depth" not in da.dims:
        ds.close()
        return None

    # Spatial selection
    if lat is not None and "lat" in da.dims:
        da = da.sel(lat=lat, method="nearest")
    elif "lat" in da.dims:
        da = da.mean(dim="lat")

    if lon is not None and "lon" in da.dims:
        da = da.sel(lon=lon, method="nearest")
    elif "lon" in da.dims:
        da = da.mean(dim="lon")

    depths = ds.depth.values.tolist()
    meta = get_variable_meta(variable)

    profiles = []
    if "time" in da.dims:
        n_times = len(ds.time)
        if time_indices is None:
            # Default: first, middle, last
            time_indices = list(range(min(n_times, 7)))

        for ti in time_indices:
            if ti >= n_times:
                continue
            vals = da.isel(time=ti).values
            vals = np.nan_to_num(vals, nan=0.0)
            time_str = str(ds.time.isel(time=ti).values)

            profiles.append({
                "time_index": ti,
                "time": time_str,
                "values": [round(float(v), 4) for v in vals],
            })
    else:
        vals = da.values
        vals = np.nan_to_num(vals, nan=0.0)
        profiles.append({
            "time_index": 0,
            "time": "",
            "values": [round(float(v), 4) for v in vals],
        })

    # Estimate thermocline/halocline if variable is temperature or salinity
    gradient_info = None
    if len(profiles) > 0 and len(depths) > 2:
        vals = np.array(profiles[-1]["values"])
        dz = np.diff(depths)
        dv = np.diff(vals)
        gradient = dv / np.where(np.abs(dz) > 1e-10, dz, 1.0)

        max_grad_idx = int(np.argmax(np.abs(gradient)))
        if abs(gradient[max_grad_idx]) > 0.01:
            gradient_info = {
                "depth": round(float((depths[max_grad_idx] + depths[max_grad_idx + 1]) / 2), 1),
                "gradient": round(float(gradient[max_grad_idx]), 6),
                "type": "thermocline" if variable in ["temperature", "thetao"] else
                        "halocline" if variable in ["salinity", "so"] else "gradient_maximum",
            }

    ds.close()

    return {
        "variable": variable,
        "display_name": meta["display"],
        "unit": meta["unit"],
        "depths": [round(d, 2) for d in depths],
        "profiles": profiles,
        "gradient_info": gradient_info,
    }


def compute_depth_time_heatmap(
    dataset_id: str,
    variable: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute a 2D heatmap: depth (Y) × time (X), coloured by variable value.

    Returns a flat data array + shape + axis values.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    # Handle derived variable
    if variable == "current_speed":
        u_var = "u" if "u" in ds.data_vars else ("uo" if "uo" in ds.data_vars else None)
        v_var = "v" if "v" in ds.data_vars else ("vo" if "vo" in ds.data_vars else None)
        if u_var and v_var:
            speed = np.sqrt(ds[u_var] ** 2 + ds[v_var] ** 2)
            speed.name = "current_speed"
            ds = ds.assign(current_speed=speed)

    if variable not in ds.data_vars:
        ds.close()
        return None

    da = ds[variable]

    if "depth" not in da.dims or "time" not in da.dims:
        ds.close()
        return None

    # Time slicing
    n_times = len(ds.time)
    end_idx = end_idx if end_idx is not None else n_times
    da = da.isel(time=slice(start_idx, min(end_idx, n_times)))

    # Spatial selection/averaging
    if lat is not None and "lat" in da.dims:
        da = da.sel(lat=lat, method="nearest")
    elif "lat" in da.dims:
        da = da.mean(dim="lat")

    if lon is not None and "lon" in da.dims:
        da = da.sel(lon=lon, method="nearest")
    elif "lon" in da.dims:
        da = da.mean(dim="lon")

    # Result shape: (depth, time) or (time, depth)
    vals = da.values
    vals = np.nan_to_num(vals, nan=0.0)

    # Ensure shape is (time, depth)
    dims = da.dims
    if dims[0] == "depth":
        vals = vals.T  # Now (time, depth)

    depths = ds.depth.values.tolist()
    times_slice = ds.time.isel(time=slice(start_idx, min(end_idx, n_times))).values

    meta = get_variable_meta(variable)

    ds.close()

    return {
        "variable": variable,
        "display_name": meta["display"],
        "unit": meta["unit"],
        "shape": list(vals.shape),  # [n_time, n_depth]
        "data": [round(float(v), 4) for v in vals.flatten()],
        "depths": [round(d, 2) for d in depths],
        "times": [str(t) for t in times_slice],
        "min_value": round(float(np.min(vals)), 4),
        "max_value": round(float(np.max(vals)), 4),
    }


def compute_ts_diagram(
    dataset_id: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute Temperature-Salinity diagram data.

    Returns T, S pairs with associated depth, time labels.
    Also computes approximate density contours.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    # Find temperature and salinity variables
    temp_var = None
    sal_var = None
    for v in ["temperature", "thetao"]:
        if v in ds.data_vars:
            temp_var = v
            break
    for v in ["salinity", "so"]:
        if v in ds.data_vars:
            sal_var = v
            break

    if temp_var is None or sal_var is None:
        ds.close()
        return None

    # Time slicing
    n_times = len(ds.time) if "time" in ds.coords else 1
    end_idx = end_idx if end_idx is not None else n_times

    # Spatial selection
    temp_da = ds[temp_var]
    sal_da = ds[sal_var]

    if lat is not None and "lat" in temp_da.dims:
        temp_da = temp_da.sel(lat=lat, method="nearest")
        sal_da = sal_da.sel(lat=sal_da.lat, method="nearest") if "lat" in sal_da.dims else sal_da
        sal_da = sal_da.sel(lat=lat, method="nearest") if "lat" in sal_da.dims else sal_da
    elif "lat" in temp_da.dims:
        temp_da = temp_da.mean(dim="lat")
        sal_da = sal_da.mean(dim="lat") if "lat" in sal_da.dims else sal_da

    if lon is not None and "lon" in temp_da.dims:
        temp_da = temp_da.sel(lon=lon, method="nearest")
        sal_da = sal_da.sel(lon=lon, method="nearest") if "lon" in sal_da.dims else sal_da
    elif "lon" in temp_da.dims:
        temp_da = temp_da.mean(dim="lon")
        sal_da = sal_da.mean(dim="lon") if "lon" in sal_da.dims else sal_da

    points = []
    has_depth = "depth" in temp_da.dims
    has_time = "time" in temp_da.dims
    depths = ds.depth.values.tolist() if has_depth else [0.0]

    time_range = range(start_idx, min(end_idx, n_times)) if has_time else [0]

    for ti in time_range:
        for di, d in enumerate(depths):
            try:
                t_val = temp_da
                s_val = sal_da

                if has_time:
                    t_val = t_val.isel(time=ti)
                    s_val = s_val.isel(time=ti) if "time" in s_val.dims else s_val
                if has_depth:
                    t_val = t_val.isel(depth=di)
                    s_val = s_val.isel(depth=di) if "depth" in s_val.dims else s_val

                tv = float(t_val.values)
                sv = float(s_val.values)

                if np.isnan(tv) or np.isnan(sv):
                    continue

                time_str = str(ds.time.isel(time=ti).values) if has_time and ti < n_times else ""

                points.append({
                    "temperature": round(tv, 4),
                    "salinity": round(sv, 4),
                    "depth": round(d, 2),
                    "time": time_str,
                    "time_index": ti,
                    "depth_index": di,
                })
            except Exception:
                continue

    # Generate density contour data (simplified UNESCO equation of state)
    # σ_t ≈ -0.093 + 0.808T - 0.0066T² + 0.802S (simplified linear approximation)
    t_range = [p["temperature"] for p in points]
    s_range = [p["salinity"] for p in points]
    if t_range and s_range:
        t_min, t_max = min(t_range), max(t_range)
        s_min, s_max = min(s_range), max(s_range)
        # Pad ranges
        t_pad = max(0.5, (t_max - t_min) * 0.1)
        s_pad = max(0.1, (s_max - s_min) * 0.1)

        t_grid = np.linspace(t_min - t_pad, t_max + t_pad, 20)
        s_grid = np.linspace(s_min - s_pad, s_max + s_pad, 20)
        T, S = np.meshgrid(t_grid, s_grid)
        # Simplified density: ρ ≈ 999.842594 + 6.793952e-2*T - 9.095290e-3*T² + 1.001685e-4*T³ - 1.120083e-6*T⁴ + 6.536332e-9*T⁵
        # + (0.824493 - 4.0899e-3*T + 7.6438e-5*T² - 8.2467e-7*T³ + 5.3875e-9*T⁴) * S
        # Simplified: σ_t ≈ density - 1000
        sigma_t = (-0.093 + 0.808 * T - 0.0066 * T**2 + 0.802 * S - 1000 + 1025)
        # More accurate simplified version
        sigma_t = (
            999.842594 + 6.793952e-2 * T - 9.095290e-3 * T**2
            + (0.824493 - 4.0899e-3 * T) * S - 1000
        )

        contours = {
            "t_grid": [round(v, 2) for v in t_grid.tolist()],
            "s_grid": [round(v, 2) for v in s_grid.tolist()],
            "density": [[round(float(sigma_t[j, i]), 2) for i in range(20)] for j in range(20)],
        }
    else:
        contours = None

    ds.close()

    return {
        "points": points,
        "n_points": len(points),
        "contours": contours,
        "temp_variable": temp_var,
        "sal_variable": sal_var,
    }
