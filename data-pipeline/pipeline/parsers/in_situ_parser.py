"""
INCOIS Data Pipeline — In-Situ Data Parser

Converts CSV/TXT Argo float and underwater glider profile data
into validated GeoJSON FeatureCollections and queryable Parquet
tables for the frontend point marker overlays.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from pipeline.parsers.base import AbstractOceanParser
from pipeline.core.config import pipeline_settings

logger = logging.getLogger(__name__)


class InSituParser(AbstractOceanParser):
    """
    Parses CSV/TXT files containing in-situ oceanographic profiles
    (Argo floats, underwater gliders, CTD casts).

    Expected CSV columns (flexible matching):
      - id / station_id / float_id / platform_id
      - longitude / lon / LONGITUDE
      - latitude / lat / LATITUDE
      - depth / pressure / DEPTH / PRES
      - temperature / temp / TEMP
      - salinity / sal / PSAL
      - timestamp / time / date / DATE_TIME

    Outputs:
      - GeoJSON FeatureCollection at {GEOJSON_DIR}/{dataset_id}.geojson
      - Parquet table at {PARQUET_DIR}/{dataset_id}.parquet
      - Metadata JSON at {METADATA_DIR}/{dataset_id}.json
    """

    SUPPORTED_EXTENSIONS = {".csv", ".txt", ".tsv", ".dat"}

    # Column alias mappings for flexible CSV ingestion
    COLUMN_ALIASES = {
        "id": ["id", "station_id", "float_id", "platform_id", "platform_number",
               "PLATFORM_NUMBER", "wmo_id", "WMO_ID"],
        "lon": ["longitude", "lon", "LONGITUDE", "LON", "lng"],
        "lat": ["latitude", "lat", "LATITUDE", "LAT"],
        "depth": ["depth", "DEPTH", "pressure", "PRES", "pres", "PRESSURE",
                   "deph", "DEPH"],
        "temperature": ["temperature", "temp", "TEMP", "sea_water_temperature",
                        "TEMP_ADJUSTED"],
        "salinity": ["salinity", "sal", "PSAL", "psal", "SALINITY",
                      "sea_water_salinity", "PSAL_ADJUSTED"],
        "timestamp": ["timestamp", "time", "TIME", "date", "DATE_TIME",
                       "datetime", "JULD", "date_time"],
        "type": ["type", "instrument_type", "platform_type", "TYPE"],
    }

    def detect(self, file_path: Path) -> bool:
        """Check if file is a supported tabular format."""
        return file_path.suffix.lower() in self.SUPPORTED_EXTENSIONS

    def parse(
        self,
        file_path: Path,
        dataset_id: str,
        output_dir: Optional[Path] = None,
        progress_callback: Optional[callable] = None,
    ) -> dict[str, Any]:
        """
        Convert a CSV/TXT file to GeoJSON + Parquet.

        Steps:
          1. Read CSV with flexible delimiter detection
          2. Normalize column names via alias mapping
          3. Generate GeoJSON FeatureCollection with [lon, lat, depth]
          4. Write Parquet table for queryable access
          5. Extract and save metadata
        """
        pipeline_settings.ensure_dirs()
        geojson_path = pipeline_settings.GEOJSON_DIR / f"{dataset_id}.geojson"
        parquet_path = pipeline_settings.PARQUET_DIR / f"{dataset_id}.parquet"
        meta_path = pipeline_settings.METADATA_DIR / f"{dataset_id}.json"

        if progress_callback:
            progress_callback(0.1)

        # Step 1: Read CSV (auto-detect delimiter)
        logger.info(f"Reading in-situ file: {file_path}")
        df = self._read_flexible_csv(file_path)

        if progress_callback:
            progress_callback(0.3)

        # Step 2: Normalize columns
        df = self._normalize_columns(df)

        if progress_callback:
            progress_callback(0.4)

        # Step 3: Generate GeoJSON
        geojson = self._to_geojson(df, dataset_id)
        with open(geojson_path, "w") as f:
            json.dump(geojson, f, indent=2, default=str)

        if progress_callback:
            progress_callback(0.7)

        # Step 4: Write Parquet
        df.to_parquet(str(parquet_path), index=False)

        if progress_callback:
            progress_callback(0.85)

        # Step 5: Metadata
        metadata = self._extract_metadata_from_df(df, dataset_id)
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2, default=str)

        if progress_callback:
            progress_callback(1.0)

        logger.info(f"In-situ conversion complete: {dataset_id}")

        return {
            "dataset_id": dataset_id,
            "geojson_path": str(geojson_path),
            "parquet_path": str(parquet_path),
            "metadata_path": str(meta_path),
            "metadata": metadata,
        }

    def extract_metadata(self, file_path: Path) -> dict[str, Any]:
        """Extract metadata without full conversion."""
        df = self._read_flexible_csv(file_path)
        df = self._normalize_columns(df)
        return self._extract_metadata_from_df(df, file_path.stem)

    # ─── Internal Helpers ─────────────────────────────────────────

    def _read_flexible_csv(self, file_path: Path) -> pd.DataFrame:
        """Read CSV/TXT with auto-detected delimiter."""
        # Try common delimiters
        for sep in [",", "\t", ";", r"\s+"]:
            try:
                df = pd.read_csv(
                    str(file_path),
                    sep=sep if sep != r"\s+" else r"\s+",
                    engine="python" if sep == r"\s+" else "c",
                    comment="#",
                    na_values=["", "NA", "NaN", "nan", "-999", "99999"],
                )
                if len(df.columns) > 1:
                    return df
            except Exception:
                continue

        raise ValueError(f"Could not parse file: {file_path}")

    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map raw column names to canonical names using alias table."""
        rename_map = {}
        existing_cols = set(df.columns)

        for canonical, aliases in self.COLUMN_ALIASES.items():
            if canonical in existing_cols:
                continue
            for alias in aliases:
                if alias in existing_cols:
                    rename_map[alias] = canonical
                    break

        if rename_map:
            df = df.rename(columns=rename_map)

        # Ensure id column exists
        if "id" not in df.columns:
            df["id"] = [f"obs_{i:04d}" for i in range(len(df))]

        # Ensure type column exists
        if "type" not in df.columns:
            df["type"] = "argo"

        return df

    def _to_geojson(self, df: pd.DataFrame, dataset_id: str) -> dict:
        """Convert DataFrame to GeoJSON FeatureCollection."""
        features = []

        for _, row in df.iterrows():
            lon = float(row.get("lon", 0))
            lat = float(row.get("lat", 0))
            depth = float(row.get("depth", 0))

            # Make depth negative (ocean convention) if positive
            if depth > 0:
                depth = -depth

            properties = {
                "id": str(row.get("id", "")),
                "instrument_type": str(row.get("type", "argo")),
            }

            # Optional fields
            if "timestamp" in row and pd.notna(row["timestamp"]):
                properties["timestamp"] = str(row["timestamp"])
            if "temperature" in row and pd.notna(row["temperature"]):
                properties["temperature"] = round(float(row["temperature"]), 3)
            if "salinity" in row and pd.notna(row["salinity"]):
                properties["salinity"] = round(float(row["salinity"]), 3)
            if "depth" in row and pd.notna(row["depth"]):
                properties["pressure"] = abs(float(row["depth"]))

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat, depth],
                },
                "properties": properties,
            })

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def _extract_metadata_from_df(self, df: pd.DataFrame, dataset_id: str) -> dict:
        """Build metadata dict from the normalized DataFrame."""
        variables = []
        for col in ["temperature", "salinity"]:
            if col in df.columns and df[col].notna().any():
                variables.append(col)

        depth_levels = []
        if "depth" in df.columns:
            depths = df["depth"].dropna().unique()
            depth_levels = sorted([float(d) for d in depths])
            # Ensure negative convention
            depth_levels = [-abs(d) for d in depth_levels]

        bounds = None
        if "lat" in df.columns and "lon" in df.columns:
            bounds = {
                "lat_min": float(df["lat"].min()),
                "lat_max": float(df["lat"].max()),
                "lon_min": float(df["lon"].min()),
                "lon_max": float(df["lon"].max()),
            }

        time_range = None
        time_steps = 0
        if "timestamp" in df.columns and df["timestamp"].notna().any():
            timestamps = pd.to_datetime(df["timestamp"], errors="coerce").dropna()
            if len(timestamps) > 0:
                time_steps = len(timestamps.unique())
                time_range = {
                    "start": str(timestamps.min()),
                    "end": str(timestamps.max()),
                }

        return {
            "dataset_id": dataset_id,
            "name": dataset_id.replace("_", " ").title(),
            "type": "insitu",
            "variables": variables,
            "depth_levels": depth_levels,
            "time_steps": time_steps,
            "time_range": time_range,
            "bounds": bounds,
            "units": {
                "temperature": "°C",
                "salinity": "PSU",
            },
        }
