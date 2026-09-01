"""
INCOIS Data Pipeline — Metadata Extractor

Standalone utility for extracting and caching bounds, depth levels,
time steps, variable min/max ranges from already-converted Zarr stores
or raw NetCDF files. Used to rebuild the metadata cache.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

from pipeline.core.config import pipeline_settings

logger = logging.getLogger(__name__)


def rebuild_metadata_cache() -> list[dict]:
    """
    Scan all Zarr stores and GeoJSON files, rebuilding metadata JSON sidecars.

    Returns list of all metadata dicts.
    """
    import xarray as xr

    all_meta = []

    # Gridded datasets (Zarr stores)
    zarr_dir = pipeline_settings.ZARR_STORE_DIR
    if zarr_dir.exists():
        for zarr_path in sorted(zarr_dir.glob("*.zarr")):
            dataset_id = zarr_path.stem
            try:
                ds = xr.open_zarr(str(zarr_path))
                metadata = _extract_zarr_metadata(ds, dataset_id)
                ds.close()

                meta_path = pipeline_settings.METADATA_DIR / f"{dataset_id}.json"
                pipeline_settings.METADATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(meta_path, "w") as f:
                    json.dump(metadata, f, indent=2, default=str)

                all_meta.append(metadata)
                logger.info(f"Rebuilt metadata for Zarr store: {dataset_id}")
            except Exception as e:
                logger.error(f"Failed to rebuild metadata for {dataset_id}: {e}")

    # In-situ datasets (GeoJSON)
    geojson_dir = pipeline_settings.GEOJSON_DIR
    if geojson_dir.exists():
        for geojson_path in sorted(geojson_dir.glob("*.geojson")):
            dataset_id = geojson_path.stem
            try:
                metadata = _extract_geojson_metadata(geojson_path, dataset_id)

                meta_path = pipeline_settings.METADATA_DIR / f"{dataset_id}.json"
                pipeline_settings.METADATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(meta_path, "w") as f:
                    json.dump(metadata, f, indent=2, default=str)

                all_meta.append(metadata)
                logger.info(f"Rebuilt metadata for GeoJSON: {dataset_id}")
            except Exception as e:
                logger.error(f"Failed to rebuild metadata for {dataset_id}: {e}")

    return all_meta


def _extract_zarr_metadata(ds, dataset_id: str) -> dict:
    """Extract metadata from an opened xarray Dataset (Zarr-backed)."""
    coord_names = {"lat", "lon", "depth", "time"}
    variables = [v for v in ds.data_vars if v not in coord_names]

    depth_levels = []
    if "depth" in ds.coords:
        depth_levels = [float(d) for d in ds.depth.values]

    time_range = None
    time_steps = 0
    if "time" in ds.coords:
        time_vals = ds.time.values
        time_steps = len(time_vals)
        time_range = {
            "start": str(time_vals[0]),
            "end": str(time_vals[-1]),
        }

    bounds = None
    if "lat" in ds.coords and "lon" in ds.coords:
        bounds = {
            "lat_min": float(np.nanmin(ds.lat.values)),
            "lat_max": float(np.nanmax(ds.lat.values)),
            "lon_min": float(np.nanmin(ds.lon.values)),
            "lon_max": float(np.nanmax(ds.lon.values)),
        }

    units = {}
    for v in variables:
        if "units" in ds[v].attrs:
            units[v] = str(ds[v].attrs["units"])

    return {
        "dataset_id": dataset_id,
        "name": dataset_id.replace("_", " ").title(),
        "type": "gridded",
        "variables": variables,
        "depth_levels": depth_levels,
        "time_steps": time_steps,
        "time_range": time_range,
        "bounds": bounds,
        "units": units,
    }


def _extract_geojson_metadata(geojson_path: Path, dataset_id: str) -> dict:
    """Extract metadata from a GeoJSON FeatureCollection file."""
    with open(geojson_path, "r") as f:
        data = json.load(f)

    features = data.get("features", [])
    if not features:
        return {
            "dataset_id": dataset_id,
            "name": dataset_id.replace("_", " ").title(),
            "type": "insitu",
            "variables": [],
            "depth_levels": [],
            "time_steps": 0,
            "bounds": None,
        }

    lons, lats, depths = [], [], []
    variables = set()

    for feat in features:
        coords = feat.get("geometry", {}).get("coordinates", [])
        if len(coords) >= 2:
            lons.append(coords[0])
            lats.append(coords[1])
        if len(coords) >= 3:
            depths.append(coords[2])

        props = feat.get("properties", {})
        if props.get("temperature") is not None:
            variables.add("temperature")
        if props.get("salinity") is not None:
            variables.add("salinity")

    bounds = None
    if lons and lats:
        bounds = {
            "lat_min": min(lats),
            "lat_max": max(lats),
            "lon_min": min(lons),
            "lon_max": max(lons),
        }

    depth_levels = sorted(set(depths)) if depths else []

    return {
        "dataset_id": dataset_id,
        "name": dataset_id.replace("_", " ").title(),
        "type": "insitu",
        "variables": sorted(variables),
        "depth_levels": depth_levels,
        "time_steps": len(features),
        "bounds": bounds,
        "units": {"temperature": "°C", "salinity": "PSU"},
    }
