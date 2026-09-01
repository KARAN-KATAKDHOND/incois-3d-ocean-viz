"""
INCOIS Backend — High-Performance Zarr Store Reader

Provides zero-copy-on-read access to consolidated Zarr stores,
returning JSON-serializable Python types (numpy→native conversion).
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Optional

import numpy as np
import xarray as xr

from app.core.config import settings


def _sanitize_value(v: Any) -> Any:
    """Convert numpy scalars to Python natives; NaN/Inf → None."""
    if v is None:
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (np.ndarray,)):
        return _sanitize_array(v)
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
    return v


def _sanitize_array(arr: np.ndarray) -> list:
    """Recursively convert a numpy array to nested Python lists with NaN→None."""
    if arr.ndim == 0:
        return _sanitize_value(arr.item())
    return [_sanitize_value(x) if arr.ndim == 1 else _sanitize_array(x) for x in arr]


def _sanitize_list(lst: list) -> list:
    """Sanitize a flat list of values."""
    return [_sanitize_value(v) for v in lst]


class ZarrReader:
    """
    Reads slices and profiles from consolidated Zarr directory stores.

    Each dataset is stored as:
        {ZARR_STORE_DIR}/{dataset_id}.zarr/

    Companion metadata JSON:
        {METADATA_DIR}/{dataset_id}.json
    """

    def __init__(self, zarr_dir: Optional[Path] = None, metadata_dir: Optional[Path] = None):
        self.zarr_dir = zarr_dir or settings.ZARR_STORE_DIR
        self.metadata_dir = metadata_dir or settings.METADATA_DIR

    # ─── Discovery ────────────────────────────────────────────────

    def list_datasets(self) -> list[dict]:
        """List all available datasets by scanning metadata JSONs."""
        datasets = []
        if not self.metadata_dir.exists():
            return datasets
        for meta_file in sorted(self.metadata_dir.glob("*.json")):
            try:
                with open(meta_file, "r") as f:
                    datasets.append(json.load(f))
            except (json.JSONDecodeError, OSError):
                continue
        return datasets

    def get_metadata(self, dataset_id: str) -> Optional[dict]:
        """Load metadata JSON for a specific dataset."""
        meta_path = self.metadata_dir / f"{dataset_id}.json"
        if not meta_path.exists():
            return None
        with open(meta_path, "r") as f:
            return json.load(f)

    # ─── Data Access ──────────────────────────────────────────────

    def _open_store(self, dataset_id: str) -> xr.Dataset:
        """Open a Zarr store lazily (no data loaded into RAM)."""
        store_path = self.zarr_dir / f"{dataset_id}.zarr"
        if not store_path.exists():
            raise FileNotFoundError(f"Zarr store not found: {store_path}")
        return xr.open_zarr(str(store_path))

    def get_slice(
        self,
        dataset_id: str,
        variable: str,
        depth_idx: int = 0,
        time_idx: int = 0,
    ) -> dict:
        """
        Extract a 2D lat-lon slice from the Zarr store.

        Returns a dict with keys: lat, lon, values (2D nested list), stats, units.
        """
        ds = self._open_store(dataset_id)

        if variable not in ds.data_vars:
            raise KeyError(f"Variable '{variable}' not found. Available: {list(ds.data_vars)}")

        da = ds[variable]

        # Build isel kwargs based on available dimensions
        sel_kwargs = {}
        if "time" in da.dims:
            sel_kwargs["time"] = time_idx
        if "depth" in da.dims:
            sel_kwargs["depth"] = depth_idx

        # Select the 2D slice
        slice_2d = da.isel(**sel_kwargs).values  # shape: (lat, lon)

        lat = ds["lat"].values.tolist()
        lon = ds["lon"].values.tolist()

        # Compute stats (ignoring NaN)
        valid = slice_2d[~np.isnan(slice_2d)] if np.issubdtype(slice_2d.dtype, np.floating) else slice_2d.ravel()
        stats = {
            "min": _sanitize_value(np.nanmin(valid)) if len(valid) > 0 else None,
            "max": _sanitize_value(np.nanmax(valid)) if len(valid) > 0 else None,
            "mean": _sanitize_value(np.nanmean(valid)) if len(valid) > 0 else None,
        }

        # Get units from metadata or attrs
        units = da.attrs.get("units", "")

        return {
            "dataset_id": dataset_id,
            "variable": variable,
            "depth_idx": depth_idx,
            "time_idx": time_idx,
            "lat": _sanitize_list(lat),
            "lon": _sanitize_list(lon),
            "values": _sanitize_array(slice_2d),
            "stats": stats,
            "units": str(units),
        }

    def get_profile(
        self,
        dataset_id: str,
        variable: str,
        lat: float,
        lon: float,
        time_idx: int = 0,
    ) -> dict:
        """
        Extract a 1D vertical profile at the nearest grid point.

        Returns a dict with keys: depths, values, units.
        """
        ds = self._open_store(dataset_id)

        if variable not in ds.data_vars:
            raise KeyError(f"Variable '{variable}' not found. Available: {list(ds.data_vars)}")

        da = ds[variable]

        # Select nearest lat/lon
        sel_kwargs = {"lat": lat, "lon": lon}
        da_point = da.sel(**sel_kwargs, method="nearest")

        # Select time
        if "time" in da_point.dims:
            da_point = da_point.isel(time=time_idx)

        # Now da_point should be 1D along depth
        if "depth" not in da_point.dims:
            # No depth dimension — return single point
            return {
                "dataset_id": dataset_id,
                "variable": variable,
                "lat": float(da_point.lat.values) if "lat" in da_point.coords else lat,
                "lon": float(da_point.lon.values) if "lon" in da_point.coords else lon,
                "time_idx": time_idx,
                "depths": [0.0],
                "values": [_sanitize_value(da_point.values.item())],
                "units": str(da.attrs.get("units", "")),
            }

        depths = ds["depth"].values.tolist()
        values = da_point.values

        # Get the actual selected lat/lon (nearest)
        actual_lat = float(da_point.lat.values) if "lat" in da_point.coords else lat
        actual_lon = float(da_point.lon.values) if "lon" in da_point.coords else lon

        return {
            "dataset_id": dataset_id,
            "variable": variable,
            "lat": actual_lat,
            "lon": actual_lon,
            "time_idx": time_idx,
            "depths": _sanitize_list(depths),
            "values": _sanitize_list(values.tolist()),
            "units": str(da.attrs.get("units", "")),
        }


# Singleton instance
zarr_reader = ZarrReader()
