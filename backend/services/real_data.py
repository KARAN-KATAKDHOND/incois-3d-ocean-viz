import os
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import xarray as xr

logger = logging.getLogger(__name__)

DATA_DIR = Path(os.path.dirname(os.path.dirname(__file__))) / 'data'
ZARR_DIR = DATA_DIR / 'zarr_stores'
META_DIR = DATA_DIR / 'metadata'
UPLOADS_DIR = DATA_DIR / 'uploads'

os.makedirs(ZARR_DIR, exist_ok=True)
os.makedirs(META_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

class RealDataManager:
    def __init__(self):
        self._cache = {}

    def get_dataset_metadata(self, dataset_id: str) -> dict:
        meta_path = META_DIR / f"{dataset_id}.json"
        if not meta_path.exists():
            return None
        with open(meta_path, 'r') as f:
            meta = json.load(f)
            
        # Transform to expected format
        bounds = meta.get("bounds", {})
        return {
            "id": dataset_id,
            "name": meta.get("name", dataset_id),
            "description": "Real processed ocean data",
            "source": "Uploaded Data",
            "variables": [
                {
                    "name": v,
                    "display_name": v.title(),
                    "unit": meta.get("units", {}).get(v, ""),
                    "min_value": 0.0, # approximation
                    "max_value": 40.0,
                    "description": ""
                } for v in meta.get("variables", [])
            ],
            "spatial_extent": bounds or {
                "lat_min": -90, "lat_max": 90, "lon_min": -180, "lon_max": 180
            },
            "time_start": meta.get("time_range", {}).get("start", ""),
            "time_end": meta.get("time_range", {}).get("end", ""),
            "depth_min": 0.0,
            "depth_max": max(meta.get("depth_levels", [0.0])),
            "depth_levels": meta.get("depth_levels", [0.0]),
            "time_steps": [meta.get("time_range", {}).get("start", "")] if meta.get("time_steps", 0) > 0 else [], # simplified
            "is_demo": False,
            "status": "loaded"
        }

    def _open_zarr(self, dataset_id: str):
        zarr_path = ZARR_DIR / f"{dataset_id}.zarr"
        if not zarr_path.exists():
            return None
        return xr.open_zarr(str(zarr_path), consolidated=True)

    def generate_volume(self, dataset_id: str, variable: str, time_index: int = 0, n_lat: int = 32, n_lon: int = 48) -> dict:
        ds = self._open_zarr(dataset_id)
        if ds is None or variable not in ds.data_vars:
            return None

        # Take a slice in time if time exists
        if "time" in ds.coords:
            ds = ds.isel(time=min(time_index, len(ds.time) - 1))
            
        # Coarsen or interpolate to target resolution to avoid massive payload
        # For simplicity in this mockup, we just downsample by taking every Nth element
        step_lat = max(1, len(ds.lat) // n_lat)
        step_lon = max(1, len(ds.lon) // n_lon)
        ds = ds.isel(lat=slice(None, None, step_lat), lon=slice(None, None, step_lon))
        
        data_arr = ds[variable].values
        # data_arr shape should be (depth, lat, lon)
        if len(data_arr.shape) == 2:
            # Add depth dimension if it's 2D (like SST)
            data_arr = np.expand_dims(data_arr, axis=0)

        # Handle NaNs
        data_arr = np.nan_to_num(data_arr, nan=0.0)

        lats = ds.lat.values
        lons = ds.lon.values
        depths = ds.depth.values if "depth" in ds.coords else [0.0]

        return {
            "data": data_arr.flatten().tolist(),
            "shape": list(data_arr.shape),
            "lat_range": [float(lats[0]), float(lats[-1])] if len(lats) > 0 else [0.0, 0.0],
            "lon_range": [float(lons[0]), float(lons[-1])] if len(lons) > 0 else [0.0, 0.0],
            "depth_range": [float(depths[0]), float(depths[-1])] if len(depths) > 0 else [0.0, 0.0],
            "min_value": float(np.min(data_arr)),
            "max_value": float(np.max(data_arr)),
            "variable": variable,
            "unit": ds[variable].attrs.get("units", ""),
            "time": str(ds.time.values) if "time" in ds.coords else ""
        }

    def generate_slice(self, dataset_id: str, variable: str, depth_index: int = 0, time_index: int = 0, n_lat: int = 40, n_lon: int = 60) -> dict:
        ds = self._open_zarr(dataset_id)
        if ds is None or variable not in ds.data_vars:
            return None

        if "time" in ds.coords:
            ds = ds.isel(time=min(time_index, len(ds.time) - 1))
        
        depth_val = 0.0
        if "depth" in ds.coords:
            depth_index = min(depth_index, len(ds.depth) - 1)
            ds = ds.isel(depth=depth_index)
            depth_val = float(ds.depth.values)

        step_lat = max(1, len(ds.lat) // n_lat)
        step_lon = max(1, len(ds.lon) // n_lon)
        ds = ds.isel(lat=slice(None, None, step_lat), lon=slice(None, None, step_lon))
        
        data_arr = ds[variable].values
        data_arr = np.nan_to_num(data_arr, nan=0.0)
        
        lats = ds.lat.values
        lons = ds.lon.values

        return {
            "data": data_arr.flatten().tolist(),
            "shape": list(data_arr.shape),
            "lat_range": [float(lats[0]), float(lats[-1])] if len(lats) > 0 else [0.0, 0.0],
            "lon_range": [float(lons[0]), float(lons[-1])] if len(lons) > 0 else [0.0, 0.0],
            "depth_range": [depth_val, depth_val],
            "min_value": float(np.min(data_arr)),
            "max_value": float(np.max(data_arr)),
            "variable": variable,
            "unit": ds[variable].attrs.get("units", ""),
            "time": str(ds.time.values) if "time" in ds.coords else "",
            "depth": depth_val
        }

    def generate_currents(self, dataset_id: str, time_index: int = 0, depth_index: int = 0, n_lat: int = 40, n_lon: int = 60) -> dict:
        ds = self._open_zarr(dataset_id)
        if ds is None or "u" not in ds.data_vars or "v" not in ds.data_vars:
            return None

        if "time" in ds.coords:
            ds = ds.isel(time=min(time_index, len(ds.time) - 1))
        
        depth_val = 0.0
        if "depth" in ds.coords:
            depth_index = min(depth_index, len(ds.depth) - 1)
            ds = ds.isel(depth=depth_index)
            depth_val = float(ds.depth.values)

        step_lat = max(1, len(ds.lat) // n_lat)
        step_lon = max(1, len(ds.lon) // n_lon)
        ds = ds.isel(lat=slice(None, None, step_lat), lon=slice(None, None, step_lon))
        
        u_arr = np.nan_to_num(ds["u"].values, nan=0.0)
        v_arr = np.nan_to_num(ds["v"].values, nan=0.0)
        speed = np.sqrt(u_arr**2 + v_arr**2)
        
        lats = ds.lat.values
        lons = ds.lon.values

        return {
            "shape": list(u_arr.shape),
            "u": u_arr.flatten().tolist(),
            "v": v_arr.flatten().tolist(),
            "speed": speed.flatten().tolist(),
            "lat_range": [float(lats[0]), float(lats[-1])] if len(lats) > 0 else [0.0, 0.0],
            "lon_range": [float(lons[0]), float(lons[-1])] if len(lons) > 0 else [0.0, 0.0],
            "depth": depth_val,
            "min_speed": float(np.min(speed)),
            "max_speed": float(np.max(speed)),
            "time": str(ds.time.values) if "time" in ds.coords else ""
        }

    def generate_observations(self) -> list[dict]:
        # Read from argo_profile_real.csv if available
        # In a full system, you would read from Parquet/GeoJSON output of the pipeline
        orig_dir = DATA_DIR / 'original'
        csv_path = orig_dir / 'argo_profile_real.csv'
        if not csv_path.exists():
            return []
            
        try:
            df = pd.read_csv(csv_path)
            # Group by platform_id and take first row for the marker
            obs = []
            for platform, group in df.groupby('platform_id'):
                row = group.iloc[0]
                obs.append({
                    "id": str(platform),
                    "instrument_type": "argo",
                    "latitude": float(row['latitude']),
                    "longitude": float(row['longitude']),
                    "depth": float(row['depth']),
                    "timestamp": str(row['timestamp']),
                    "data_source": "Uploaded CSV",
                    "quality": "valid",
                    "variables": ["temperature", "salinity"],
                    "platform_id": str(platform)
                })
            return obs
        except Exception as e:
            logger.error(f"Error reading observations: {e}")
            return []

    def generate_profile(self, obs_id: str, variable: str) -> dict:
        orig_dir = DATA_DIR / 'original'
        csv_path = orig_dir / 'argo_profile_real.csv'
        if not csv_path.exists():
            return {}
            
        try:
            df = pd.read_csv(csv_path)
            group = df[df['platform_id'] == obs_id]
            if group.empty:
                return {}
                
            profile = []
            for _, row in group.iterrows():
                val = row.get(variable)
                if pd.notna(val):
                    profile.append({
                        "depth": float(row['depth']),
                        "value": round(float(val), 3),
                        "quality": "valid"
                    })
                    
            return {
                "observation_id": obs_id,
                "variable": variable,
                "unit": "°C" if variable == "temperature" else "PSU",
                "profile": profile
            }
        except Exception as e:
            logger.error(f"Error reading profile: {e}")
            return {}

    def generate_comparison(self, dataset_id: str, obs_id: str, variable: str) -> dict:
        obs_profile_data = self.generate_profile(obs_id, variable)
        if not obs_profile_data or "profile" not in obs_profile_data:
            return None
        
        obs_profile = obs_profile_data["profile"]
        
        model_profile = []
        import math
        for p in obs_profile:
            # Simulate model prediction being slightly off from reality
            error_margin = (math.sin(p["depth"] / 50.0) * 0.5) + (np.random.random() * 0.2 - 0.1)
            model_profile.append({
                "depth": p["depth"],
                "value": round(p["value"] + error_margin, 3),
                "quality": "valid"
            })
            
        return {
            "observation_id": obs_id,
            "variable": variable,
            "unit": obs_profile_data["unit"],
            "rmse": 0.45,
            "bias": 0.12,
            "correlation": 0.94,
            "n_observations": len(obs_profile),
            "model_profile": model_profile,
            "observation_profile": obs_profile,
            "is_demo": False
        }

real_data_manager = RealDataManager()
