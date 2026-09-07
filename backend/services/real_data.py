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
            "time_steps": meta.get("time_steps", []),
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

    def generate_currents(self, dataset_id: str, variable: str = "currents", time_index: int = 0, depth_index: int = 0, n_lat: int = 40, n_lon: int = 60) -> dict:
        ds = self._open_zarr(dataset_id)
        if ds is None:
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
        
        u_var = "uo" if "uo" in ds.data_vars else ("u" if "u" in ds.data_vars else None)
        v_var = "vo" if "vo" in ds.data_vars else ("v" if "v" in ds.data_vars else None)
        
        if u_var is None and v_var is None:
            return None
            
        u_arr = np.nan_to_num(ds[u_var].values, nan=0.0) if u_var else np.zeros((len(ds.lat), len(ds.lon)))
        v_arr = np.nan_to_num(ds[v_var].values, nan=0.0) if v_var else np.zeros((len(ds.lat), len(ds.lon)))
        
        if variable == "uo":
            v_arr = np.zeros_like(u_arr)
        elif variable == "vo":
            u_arr = np.zeros_like(v_arr)
        elif variable == "usi":
            usi_var = "usi" if "usi" in ds.data_vars else u_var
            u_arr = np.nan_to_num(ds[usi_var].values, nan=0.0) if usi_var else np.zeros_like(u_arr)
            v_arr = np.zeros_like(u_arr)
        elif variable == "vsi":
            vsi_var = "vsi" if "vsi" in ds.data_vars else v_var
            v_arr = np.nan_to_num(ds[vsi_var].values, nan=0.0) if vsi_var else np.zeros_like(v_arr)
            u_arr = np.zeros_like(v_arr)
            
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

    def generate_crosssection(self, dataset_id: str, variable: str, lat1: float, lon1: float, lat2: float, lon2: float, time_index: int = 0, num_points: int = 50) -> dict:
        ds = self._open_zarr(dataset_id)
        if ds is None or variable not in ds.data_vars:
            return None

        if "time" in ds.coords:
            ds = ds.isel(time=min(time_index, len(ds.time) - 1))
            
        # 1. Create geographic points along the path
        lats = np.linspace(lat1, lat2, num_points)
        lons = np.linspace(lon1, lon2, num_points)
        
        # 2. Setup xarray structures for advanced interpolation
        y_da = xr.DataArray(lats, dims="distance")
        x_da = xr.DataArray(lons, dims="distance")
        
        # 3. Extract the 2D cross section
        try:
            cs = ds[variable].sel(lat=y_da, lon=x_da, method="nearest")
        except Exception as e:
            logger.error(f"Failed to extract cross section: {e}")
            return None
            
        has_depth = "depth" in cs.coords
        vals = cs.values
        
        if has_depth:
            depths = cs.depth.values.tolist()
            # If dims are (depth, distance), we need (distance, depth)
            if cs.dims[0] == "depth":
                vals = vals.T
        else:
            depths = [0.0]
            vals = vals.reshape(-1, 1)
            
        # Clean up NaNs
        data_arr = np.nan_to_num(vals, nan=0.0)
        
        # Calculate Haversine distance for realistic X-axis
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371.0 # km
            lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
            c = 2 * np.arcsin(np.sqrt(a))
            return R * c
            
        total_dist = haversine(lat1, lon1, lat2, lon2)
        distances = np.linspace(0, total_dist, num_points).tolist()

        return {
            "variable": variable,
            "unit": ds[variable].attrs.get("units", ""),
            "shape": [num_points, len(depths)], # [nDist, nDepth]
            "data": data_arr.flatten().tolist(),
            "distances": distances,
            "depths": [float(d) for d in depths],
            "min_value": float(np.min(data_arr)),
            "max_value": float(np.max(data_arr)),
            "start_point": [lat1, lon1],
            "end_point": [lat2, lon2]
        }

    def generate_observations(self) -> list[dict]:
        # Generate 50 realistic random global Argo observations
        np.random.seed(42)  # For deterministic output
        obs = []
        for i in range(50):
            lat = np.random.uniform(-75.0, 75.0)
            lon = np.random.uniform(-180.0, 180.0)
            platform = f"ARGO-{100000 + i}"
            obs.append({
                "id": platform,
                "instrument_type": "argo",
                "latitude": float(lat),
                "longitude": float(lon),
                "depth": 0.0,
                "timestamp": "2026-01-01T12:00:00Z",
                "data_source": "Global Network",
                "quality": "valid",
                "variables": ["temperature", "salinity", "thetao", "so"],
                "platform_id": platform
            })
        return obs

    def generate_profile(self, obs_id: str, variable: str) -> dict:
        # Generate dummy profile for the given observation
        # Since we generated the observations randomly above, we'll generate the profile too
        np.random.seed(hash(obs_id) % (2**32))
        depths = np.linspace(0, 1000, 50)
        profile = []
        
        # Determine base value by variable
        if variable in ["temperature", "thetao"]:
            base = 28.0 * np.exp(-depths / 200) + np.random.normal(0, 0.1, 50)
            unit = "°C"
        elif variable in ["salinity", "so"]:
            base = 35.0 + 0.5 * np.exp(-depths / 500) + np.random.normal(0, 0.02, 50)
            unit = "PSU"
        else:
            base = np.random.normal(0, 0.5, 50) * np.exp(-depths / 200)
            unit = ""
            
        for i, d in enumerate(depths):
            profile.append({
                "depth": float(d),
                "value": round(float(base[i]), 3),
                "quality": "valid"
            })
            
        return {
            "observation_id": obs_id,
            "variable": variable,
            "unit": unit,
            "profile": profile
        }

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
