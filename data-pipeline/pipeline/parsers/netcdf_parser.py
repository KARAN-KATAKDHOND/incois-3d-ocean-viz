"""
INCOIS Data Pipeline — NetCDF to Zarr Parser

Lazily opens multi-gigabyte NetCDF4 files using xarray + Dask,
normalizes coordinate names per CF Conventions, and converts
to consolidated Zarr directory stores chunked optimally for
2D lat-lon slice access.

INVARIANT: Never loads the full array into RAM. All operations
           are chunk-streamed through Dask.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

import numpy as np
import xarray as xr

from pipeline.parsers.base import AbstractOceanParser
from pipeline.core.config import pipeline_settings

logger = logging.getLogger(__name__)


class NetCDFParser(AbstractOceanParser):
    """
    Converts NetCDF4 ocean model outputs to consolidated Zarr stores.

    Handles CF Convention coordinate normalization, rechunking,
    and metadata extraction.
    """

    SUPPORTED_EXTENSIONS = {".nc", ".nc4", ".netcdf", ".cdf"}

    def detect(self, file_path: Path) -> bool:
        """Check if file is a NetCDF by extension."""
        return file_path.suffix.lower() in self.SUPPORTED_EXTENSIONS

    def parse(
        self,
        file_path: Path,
        dataset_id: str,
        output_dir: Optional[Path] = None,
        progress_callback: Optional[callable] = None,
    ) -> dict[str, Any]:
        """
        Convert a NetCDF file to a consolidated Zarr store.

        Steps:
          1. Open lazily with xarray (Dask-backed chunks)
          2. Normalize coordinate names (CF Conventions)
          3. Rechunk to optimal schema for 2D slicing
          4. Write to Zarr directory store
          5. Extract and save metadata JSON sidecar
        """
        output_dir = output_dir or pipeline_settings.ZARR_STORE_DIR
        output_dir.mkdir(parents=True, exist_ok=True)

        zarr_path = output_dir / f"{dataset_id}.zarr"
        meta_path = pipeline_settings.METADATA_DIR / f"{dataset_id}.json"
        pipeline_settings.METADATA_DIR.mkdir(parents=True, exist_ok=True)

        if progress_callback:
            progress_callback(0.1)

        logger.info(f"Opening NetCDF: {file_path}")

        # Step 1: Open lazily — NEVER load full file into RAM
        ds = xr.open_dataset(str(file_path), chunks="auto")

        if progress_callback:
            progress_callback(0.2)

        # Step 2: Normalize coordinates
        ds = self._normalize_coordinates(ds)

        if progress_callback:
            progress_callback(0.3)

        # Step 3: Rechunk for optimal 2D slicing
        ds = self._rechunk(ds)

        if progress_callback:
            progress_callback(0.4)

        # Step 4: Write to Zarr (streaming, chunk-by-chunk)
        logger.info(f"Writing Zarr store: {zarr_path}")
        if zarr_path.exists():
            import shutil
            shutil.rmtree(zarr_path)

        ds.to_zarr(str(zarr_path), mode="w", consolidated=True)

        if progress_callback:
            progress_callback(0.8)

        # Step 5: Extract metadata
        metadata = self._extract_full_metadata(ds, dataset_id)

        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2, default=str)

        if progress_callback:
            progress_callback(1.0)

        ds.close()

        logger.info(f"NetCDF conversion complete: {dataset_id}")

        return {
            "dataset_id": dataset_id,
            "output_path": str(zarr_path),
            "metadata_path": str(meta_path),
            "metadata": metadata,
        }

    def extract_metadata(self, file_path: Path) -> dict[str, Any]:
        """Extract metadata without full conversion."""
        ds = xr.open_dataset(str(file_path), chunks="auto")
        ds = self._normalize_coordinates(ds)
        metadata = self._extract_full_metadata(ds, file_path.stem)
        ds.close()
        return metadata

    # ─── Internal Helpers ─────────────────────────────────────────

    def _normalize_coordinates(self, ds: xr.Dataset) -> xr.Dataset:
        """
        Auto-detect and rename coordinate variables to canonical names.

        Maps aliases like LONGITUDE/lon_rho → lon, LATITUDE/lat_rho → lat,
        DEPTH/nav_lev → depth, TIME/time_counter → time.
        """
        alias_map = self.get_coordinate_mapping()
        rename_map = {}

        all_names = set(ds.dims) | set(ds.coords) | set(ds.data_vars)

        for canonical, aliases in alias_map.items():
            # Skip if canonical already exists
            if canonical in all_names:
                continue

            for alias in aliases:
                if alias in all_names:
                    rename_map[alias] = canonical
                    logger.info(f"Coordinate alias: {alias} → {canonical}")
                    break

        if rename_map:
            ds = ds.rename(rename_map)

        return ds

    def _rechunk(self, ds: xr.Dataset) -> xr.Dataset:
        """Rechunk dataset for optimal 2D lat-lon slice performance."""
        target_chunks = {}

        if "time" in ds.dims:
            target_chunks["time"] = min(
                pipeline_settings.ZARR_CHUNK_TIME,
                ds.dims["time"],
            )
        if "depth" in ds.dims:
            target_chunks["depth"] = min(
                pipeline_settings.ZARR_CHUNK_DEPTH,
                ds.dims["depth"],
            )
        if "lat" in ds.dims:
            target_chunks["lat"] = min(
                pipeline_settings.ZARR_CHUNK_LAT,
                ds.dims["lat"],
            )
        if "lon" in ds.dims:
            target_chunks["lon"] = min(
                pipeline_settings.ZARR_CHUNK_LON,
                ds.dims["lon"],
            )

        if target_chunks:
            ds = ds.chunk(target_chunks)

        return ds

    def _extract_full_metadata(self, ds: xr.Dataset, dataset_id: str) -> dict:
        """Build the full metadata dict for the JSON sidecar."""
        # Identify data variables (exclude coordinates)
        coord_names = {"lat", "lon", "depth", "time"}
        variables = [v for v in ds.data_vars if v not in coord_names]

        # Depth levels
        depth_levels = []
        if "depth" in ds.coords:
            depth_levels = [float(d) for d in ds.depth.values]

        # Time range
        time_range = None
        time_steps = 0
        if "time" in ds.coords:
            time_vals = ds.time.values
            time_steps = len(time_vals)
            time_range = {
                "start": str(time_vals[0]),
                "end": str(time_vals[-1]),
            }

        # Spatial bounds
        bounds = None
        if "lat" in ds.coords and "lon" in ds.coords:
            bounds = {
                "lat_min": float(np.nanmin(ds.lat.values)),
                "lat_max": float(np.nanmax(ds.lat.values)),
                "lon_min": float(np.nanmin(ds.lon.values)),
                "lon_max": float(np.nanmax(ds.lon.values)),
            }

        # Variable units
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
