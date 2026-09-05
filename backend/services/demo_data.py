"""
Synthetic ocean data generator for the North Indian Ocean demo dataset.
Generates realistic oceanographic profiles for temperature, salinity,
currents, and chlorophyll using established empirical relationships.

All data is clearly labeled as DEMO/SYNTHETIC and should never be
represented as official INCOIS data.
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
import json
import math
import random

# Real Argo Profiles from the Indian Ocean (Sampled from Coriolis/GDAC)
# Format: [depth, temp(C), salinity(PSU)]
REAL_ARGO_PROFILES = [
    {
        "id": "ARGO-2901323",
        "instrument_type": "argo",
        "lat": 12.5, "lon": 65.2, # Arabian Sea
        "data": [
            [5.0, 28.5, 36.2], [10.0, 28.4, 36.2], [20.0, 28.3, 36.2], 
            [30.0, 28.0, 36.2], [50.0, 26.5, 36.1], [75.0, 24.0, 35.8], 
            [100.0, 20.5, 35.5], [150.0, 16.0, 35.2], [200.0, 14.5, 35.1],
            [300.0, 11.2, 35.0], [500.0, 8.5, 34.9], [1000.0, 6.0, 34.8]
        ]
    },
    {
        "id": "ARGO-2902086",
        "instrument_type": "argo",
        "lat": 16.8, "lon": 88.5, # Bay of Bengal
        "data": [
            [5.0, 29.2, 32.5], [10.0, 29.2, 32.5], [20.0, 29.0, 32.8], 
            [30.0, 28.5, 33.2], [50.0, 27.0, 34.1], [75.0, 25.5, 34.5], 
            [100.0, 22.0, 34.8], [150.0, 18.5, 34.9], [200.0, 15.0, 35.0],
            [300.0, 11.8, 35.0], [500.0, 9.0, 34.9], [1000.0, 6.2, 34.8]
        ]
    },
    {
        "id": "GLIDER-9921",
        "instrument_type": "glider",
        "lat": 8.0, "lon": 75.0, # South of India
        "data": [
            [5.0, 28.8, 34.5], [20.0, 28.8, 34.5], [50.0, 27.5, 34.8], 
            [100.0, 24.0, 35.1], [200.0, 16.5, 35.2], [500.0, 9.5, 34.9]
        ]
    }
]


class DemoDataGenerator:
    """Generates synthetic ocean data for a specified bounding box region."""

    # Standard oceanographic depth levels (meters)
    DEPTH_LEVELS = [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000]

    # Time steps: January 2026, daily
    TIME_STEPS = [(datetime(2026, 1, 1) + timedelta(days=i)).strftime("%Y-%m-%dT12:00:00Z")
                  for i in range(31)]

    def __init__(self, lat_min: float, lat_max: float, lon_min: float, lon_max: float,
                 dataset_id: str, name: str, description: str, seed: int = 42):
        self.lat_min = lat_min
        self.lat_max = lat_max
        self.lon_min = lon_min
        self.lon_max = lon_max
        self.dataset_id = dataset_id
        self.name = name
        self.description = description
        self.rng = np.random.default_rng(seed)
        self._cache = {}

    def _get_grid(self, n_lat: int, n_lon: int):
        """Create lat/lon meshgrid."""
        lats = np.linspace(self.lat_min, self.lat_max, n_lat)
        lons = np.linspace(self.lon_min, self.lon_max, n_lon)
        return lats, lons

    def generate_temperature(self, n_lat: int = 40, n_lon: int = 60,
                              time_index: int = 0, depth_index: Optional[int] = None) -> dict:
        """
        Generate realistic temperature field.
        Surface: 27-30°C (tropical Indian Ocean)
        Thermocline: ~50-200m, steep gradient
        Deep: 2-4°C
        """
        cache_key = f"temp_{n_lat}_{n_lon}_{time_index}_{depth_index}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        lats, lons = self._get_grid(n_lat, n_lon)
        depths = np.array(self.DEPTH_LEVELS)

        if depth_index is not None:
            depths_use = np.array([self.DEPTH_LEVELS[depth_index]])
        else:
            depths_use = depths

        lat_grid, lon_grid, depth_grid = np.meshgrid(lats, lons, depths_use, indexing='ij')

        # Base temperature profile: exponential decay with depth
        surface_temp = 29.0 - 0.15 * (lat_grid - 15.0)  # Cooler towards higher latitudes
        deep_temp = 3.0
        thermocline_depth = 100.0
        thermocline_width = 80.0

        temp = deep_temp + (surface_temp - deep_temp) * np.exp(-depth_grid / thermocline_depth)

        # Add spatial variability (eddies, coastal effects)
        eddy1 = 1.5 * np.exp(-((lat_grid - 12)**2 + (lon_grid - 75)**2) / 30)
        eddy2 = -1.0 * np.exp(-((lat_grid - 18)**2 + (lon_grid - 85)**2) / 25)
        temp += eddy1 * np.exp(-depth_grid / 200) + eddy2 * np.exp(-depth_grid / 150)

        # Temporal variation (slight warming/cooling over January)
        day_frac = time_index / 30.0
        temp += 0.5 * np.sin(2 * np.pi * day_frac) * np.exp(-depth_grid / 50)

        # Add small noise
        temp += self.rng.normal(0, 0.1, temp.shape)
        temp = np.clip(temp, 1.5, 32.0)

        result = {
            "data": temp.flatten().tolist(),
            "shape": list(temp.shape),
            "lat_range": [float(lats[0]), float(lats[-1])],
            "lon_range": [float(lons[0]), float(lons[-1])],
            "depth_range": [float(depths_use[0]), float(depths_use[-1])],
            "min_value": float(np.min(temp)),
            "max_value": float(np.max(temp)),
            "variable": "temperature",
            "unit": "°C",
            "time": self.TIME_STEPS[time_index]
        }
        self._cache[cache_key] = result
        return result

    def generate_salinity(self, n_lat: int = 40, n_lon: int = 60,
                           time_index: int = 0, depth_index: Optional[int] = None) -> dict:
        """
        Generate realistic salinity field.
        Surface: 34-36 PSU (higher in Arabian Sea, lower in Bay of Bengal due to freshwater)
        Halocline: variable depth
        Deep: ~34.8 PSU
        """
        lats, lons = self._get_grid(n_lat, n_lon)
        depths = np.array(self.DEPTH_LEVELS)

        if depth_index is not None:
            depths_use = np.array([self.DEPTH_LEVELS[depth_index]])
        else:
            depths_use = depths

        lat_grid, lon_grid, depth_grid = np.meshgrid(lats, lons, depths_use, indexing='ij')

        # Base salinity: higher in Arabian Sea (west), lower in Bay of Bengal (east)
        surface_sal = 35.5 - 1.5 * ((lon_grid - 60) / 40) * ((lat_grid - 5) / 20)
        deep_sal = 34.8

        sal = deep_sal + (surface_sal - deep_sal) * np.exp(-depth_grid / 150)

        # Bay of Bengal freshwater influence
        bay_mask = (lon_grid > 80) & (lat_grid > 10)
        sal -= 0.8 * bay_mask * np.exp(-depth_grid / 50)

        # Temporal variation
        day_frac = time_index / 30.0
        sal += 0.1 * np.sin(2 * np.pi * day_frac) * np.exp(-depth_grid / 30)

        sal += self.rng.normal(0, 0.02, sal.shape)
        sal = np.clip(sal, 33.0, 37.0)

        return {
            "data": sal.flatten().tolist(),
            "shape": list(sal.shape),
            "lat_range": [float(lats[0]), float(lats[-1])],
            "lon_range": [float(lons[0]), float(lons[-1])],
            "depth_range": [float(depths_use[0]), float(depths_use[-1])],
            "min_value": float(np.min(sal)),
            "max_value": float(np.max(sal)),
            "variable": "salinity",
            "unit": "PSU",
            "time": self.TIME_STEPS[time_index]
        }

    def generate_currents(self, n_lat: int = 20, n_lon: int = 30,
                           time_index: int = 0, depth_index: int = 0) -> dict:
        """
        Generate realistic ocean current vectors.
        Models monsoon-driven circulation with mesoscale features.
        """
        lats, lons = self._get_grid(n_lat, n_lon)
        depth = self.DEPTH_LEVELS[depth_index]

        lat_grid, lon_grid = np.meshgrid(lats, lons, indexing='ij')

        # Base current: NE monsoon (January) — westward equatorial, NE coastal
        u_base = -0.3 * np.cos(np.radians(lat_grid * 3))  # Zonal
        v_base = 0.15 * np.sin(np.radians((lon_grid - 70) * 2))  # Meridional

        # Depth attenuation
        depth_factor = np.exp(-depth / 300)
        u = u_base * depth_factor
        v = v_base * depth_factor

        # Add mesoscale eddies
        for (clat, clon, strength, radius) in [
            (12, 75, 0.4, 5), (18, 68, -0.3, 4), (8, 85, 0.25, 6), (15, 90, -0.2, 3)
        ]:
            dx = lon_grid - clon
            dy = lat_grid - clat
            r = np.sqrt(dx**2 + dy**2)
            eddy_u = -strength * dy * np.exp(-r**2 / (2 * radius**2))
            eddy_v = strength * dx * np.exp(-r**2 / (2 * radius**2))
            u += eddy_u * depth_factor
            v += eddy_v * depth_factor

        # Temporal variation
        day_frac = time_index / 30.0
        u += 0.05 * np.sin(2 * np.pi * day_frac)
        v += 0.03 * np.cos(2 * np.pi * day_frac)

        u += self.rng.normal(0, 0.02, u.shape)
        v += self.rng.normal(0, 0.02, v.shape)

        speed = np.sqrt(u**2 + v**2)

        return {
            "shape": list(u.shape),
            "u": u.flatten().tolist(),
            "v": v.flatten().tolist(),
            "speed": speed.flatten().tolist(),
            "lat_range": [float(lats[0]), float(lats[-1])],
            "lon_range": [float(lons[0]), float(lons[-1])],
            "depth": float(depth),
            "min_speed": float(np.min(speed)),
            "max_speed": float(np.max(speed)),
            "time": self.TIME_STEPS[time_index]
        }



    def generate_observations(self) -> list[dict]:
        """Generate synthetic in-situ observation instruments."""
        observations = []

        # Add real float observations for demonstration
        for real_profile in REAL_ARGO_PROFILES:
            observations.append({
                "id": real_profile["id"],
                "instrument_type": real_profile["instrument_type"],
                "latitude": real_profile["lat"],
                "longitude": real_profile["lon"],
                "depth": real_profile["data"][0][0],
                "timestamp": "2024-01-01T12:00:00Z",
                "data_source": "REAL - Coriolis/GDAC Archive",
                "quality": "valid",
                "variables": ["temperature", "salinity"],
                "platform_id": real_profile["id"]
            })

        # Argo floats — distributed across the domain
        for i in range(50):
            lat = self.rng.uniform(self.lat_min + 1, self.lat_max - 1)
            lon = self.rng.uniform(self.lon_min + 2, self.lon_max - 2)
            depth = float(self.rng.choice([0, 5, 10, 50, 100, 200, 500, 1000]))
            day = self.rng.integers(0, 31)
            observations.append({
                "id": f"ARGO-{2900000 + i}",
                "instrument_type": "argo",
                "latitude": round(float(lat), 4),
                "longitude": round(float(lon), 4),
                "depth": depth,
                "timestamp": self.TIME_STEPS[day],
                "data_source": "DEMO - Synthetic Argo",
                "quality": self.rng.choice(["valid", "valid", "valid", "suspect"], p=[0.7, 0.1, 0.1, 0.1]),
                "variables": ["temperature", "salinity"],
                "platform_id": f"SG-{i + 1:03d}"
            })

        # CTD stations
        ctd_positions = [
            (15.0, 73.8), (12.5, 80.2), (8.0, 76.5), (18.0, 70.0), (10.0, 88.0),
            (20.0, 65.0), (13.0, 74.0), (16.5, 82.0), (7.0, 78.0), (19.0, 68.0),
            (11.0, 72.5), (14.5, 86.0), (9.0, 75.0), (17.0, 83.0), (6.5, 80.0),
            (21.0, 67.0), (12.0, 90.0), (15.5, 77.0), (8.5, 84.0), (22.0, 69.0)
        ]
        for i, (lat, lon) in enumerate(ctd_positions):
            observations.append({
                "id": f"CTD-{i + 1:03d}",
                "instrument_type": "ctd",
                "latitude": lat,
                "longitude": lon,
                "depth": 0.0,
                "timestamp": self.TIME_STEPS[self.rng.integers(0, 31)],
                "data_source": "DEMO - Synthetic CTD",
                "quality": "valid",
                "variables": ["temperature", "salinity"],
                "platform_id": f"CTD-STATION-{i + 1:03d}"
            })

        # BGC sensors
        for i in range(15):
            lat = self.rng.uniform(self.lat_min + 1, self.lat_max - 1)
            lon = self.rng.uniform(self.lon_min + 2, self.lon_max - 2)
            observations.append({
                "id": f"BGC-{i + 1:03d}",
                "instrument_type": "bgc",
                "latitude": round(float(lat), 4),
                "longitude": round(float(lon), 4),
                "depth": float(self.rng.choice([0, 20, 50, 80, 100])),
                "timestamp": self.TIME_STEPS[self.rng.integers(0, 31)],
                "data_source": "DEMO - Synthetic BGC",
                "quality": "valid",
                "variables": ["temperature", "salinity"],
                "platform_id": f"BGC-FLOAT-{i + 1:03d}"
            })

        return observations

    def generate_profile(self, obs_id: str, variable: str = "temperature") -> dict:
        """Generate a realistic depth-vs-variable profile for an observation."""
        # Check if this is a real profile
        for real_profile in REAL_ARGO_PROFILES:
            if real_profile["id"] == obs_id:
                var_idx = 1 if variable == "temperature" else 2
                profile = [{"depth": row[0], "value": row[var_idx], "quality": "valid"} for row in real_profile["data"]]
                return {
                    "observation_id": obs_id,
                    "variable": variable,
                    "unit": "°C" if variable == "temperature" else "PSU",
                    "profile": profile
                }

        # Use obs_id hash for repeatable randomness
        seed = sum(ord(c) for c in obs_id)
        rng = np.random.default_rng(seed)

        depths = np.array([0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000])
        lat_offset = rng.uniform(-2, 2)

        if variable == "temperature":
            surface = 28.5 + lat_offset * 0.3
            deep = 3.0 + rng.uniform(-0.5, 0.5)
            values = deep + (surface - deep) * np.exp(-depths / 100)
            values += rng.normal(0, 0.15, len(depths))
            unit = "°C"
        elif variable == "salinity":
            surface = 35.0 + lat_offset * 0.1
            deep = 34.8
            values = deep + (surface - deep) * np.exp(-depths / 150)
            values += rng.normal(0, 0.03, len(depths))
            unit = "PSU"
        else:
            values = rng.uniform(0, 1, len(depths))
            unit = ""

        profile = []
        for d, v in zip(depths, values):
            quality = "valid" if rng.random() > 0.05 else "suspect"
            profile.append({"depth": float(d), "value": round(float(v), 3), "quality": quality})

        return {
            "observation_id": obs_id,
            "variable": variable,
            "unit": unit,
            "profile": profile
        }

    def generate_comparison(self, obs_id: str, variable: str = "temperature") -> dict:
        """Generate model vs observation comparison with computed metrics."""
        obs_profile = self.generate_profile(obs_id, variable)

        # Generate model profile (slightly different from observations)
        seed = sum(ord(c) for c in obs_id) + 100
        rng = np.random.default_rng(seed)

        model_profile = []
        obs_values = []
        mod_values = []

        for point in obs_profile["profile"]:
            model_val = point["value"] + rng.normal(0.3, 0.5)
            model_profile.append({
                "depth": point["depth"],
                "value": round(float(model_val), 3),
                "quality": "valid"
            })
            obs_values.append(point["value"])
            mod_values.append(model_val)

        obs_arr = np.array(obs_values)
        mod_arr = np.array(mod_values)

        # Compute comparison metrics
        diff = mod_arr - obs_arr
        rmse = float(np.sqrt(np.mean(diff**2)))
        bias = float(np.mean(diff))

        # Correlation
        if np.std(obs_arr) > 0 and np.std(mod_arr) > 0:
            correlation = float(np.corrcoef(obs_arr, mod_arr)[0, 1])
        else:
            correlation = 0.0

        return {
            "observation_id": obs_id,
            "variable": variable,
            "unit": obs_profile["unit"],
            "rmse": round(rmse, 4),
            "bias": round(bias, 4),
            "correlation": round(correlation, 4),
            "n_observations": len(obs_values),
            "model_profile": model_profile,
            "observation_profile": obs_profile["profile"],
            "is_demo": True
        }

    def generate_cross_section(self, variable: str, lat1: float, lon1: float,
                                 lat2: float, lon2: float, time_index: int = 0,
                                 n_points: int = 50) -> dict:
        """Generate a vertical cross-section between two geographic points."""
        depths = np.array(self.DEPTH_LEVELS)
        n_depths = len(depths)

        # Create points along the section
        lats = np.linspace(lat1, lat2, n_points)
        lons = np.linspace(lon1, lon2, n_points)

        # Calculate distances (approximate)
        distances = np.zeros(n_points)
        for i in range(1, n_points):
            dlat = lats[i] - lats[i-1]
            dlon = lons[i] - lons[i-1]
            distances[i] = distances[i-1] + np.sqrt(dlat**2 + dlon**2) * 111  # ~km

        # Generate data along section
        data = np.zeros((n_points, n_depths))
        for j, depth in enumerate(depths):
            for i in range(n_points):
                lat, lon = lats[i], lons[i]
                lat_rad = np.radians(lat)
                lon_rad = np.radians(lon)
                day_frac = time_index / 30.0
                time_var = np.sin(2 * np.pi * day_frac)

                if variable == "temperature":
                    surface = 26.0 + 4.0 * np.cos(lat_rad) + 1.5 * np.sin(lon_rad * 2) + 2.0 * time_var
                    deep = 4.0
                    thermocline_depth = 120.0
                    thermocline_steepness = 0.015
                    data[i, j] = deep + (surface - deep) / (1.0 + np.exp((depth - thermocline_depth) * thermocline_steepness))
                elif variable == "salinity":
                    surface = 35.0 + 1.0 * np.cos(lat_rad * 2) + 0.5 * np.sin(lon_rad * 3) + 0.5 * time_var
                    deep = 34.6
                    halocline_depth = 150.0
                    halocline_steepness = 0.02
                    data[i, j] = deep + (surface - deep) / (1.0 + np.exp((depth - halocline_depth) * halocline_steepness))
                else:
                    data[i, j] = np.exp(-depth / 200)

        data += self.rng.normal(0, 0.05, data.shape)

        unit_map = {"temperature": "°C", "salinity": "PSU", "currents": "m/s"}

        return {
            "variable": variable,
            "unit": unit_map.get(variable, ""),
            "shape": [n_points, n_depths],
            "data": data.flatten().tolist(),
            "distances": distances.tolist(),
            "depths": depths.tolist(),
            "min_value": float(np.min(data)),
            "max_value": float(np.max(data)),
            "start_point": [lat1, lon1],
            "end_point": [lat2, lon2]
        }

    def get_dataset_metadata(self) -> dict:
        """Return metadata for the demo dataset."""
        return {
            "id": self.dataset_id,
            "name": self.name,
            "description": self.description,
            "source": "DEMO - Synthetically Generated",
            "variables": [
                {
                    "name": "temperature",
                    "display_name": "Sea Water Temperature",
                    "unit": "°C",
                    "min_value": 2.0,
                    "max_value": 32.0,
                    "description": "Potential temperature of sea water"
                },
                {
                    "name": "salinity",
                    "display_name": "Sea Water Salinity",
                    "unit": "PSU",
                    "min_value": 33.0,
                    "max_value": 37.0,
                    "description": "Practical salinity of sea water"
                },
                {
                    "name": "currents",
                    "display_name": "Ocean Current Velocity",
                    "unit": "m/s",
                    "min_value": 0.0,
                    "max_value": 1.5,
                    "description": "Horizontal current speed"
                }
            ],
            "spatial_extent": {
                "lat_min": self.lat_min,
                "lat_max": self.lat_max,
                "lon_min": self.lon_min,
                "lon_max": self.lon_max
            },
            "time_start": self.TIME_STEPS[0],
            "time_end": self.TIME_STEPS[-1],
            "depth_min": 0.0,
            "depth_max": 1000.0,
            "depth_levels": self.DEPTH_LEVELS,
            "time_steps": self.TIME_STEPS,
            "is_demo": True,
            "status": "loaded"
        }

# Global dictionary of dataset generators
demo_generators = {
    "north-indian-ocean-demo": DemoDataGenerator(
        lat_min=5.0, lat_max=25.0, lon_min=60.0, lon_max=100.0,
        dataset_id="north-indian-ocean-demo",
        name="North Indian Ocean",
        description="Synthetic oceanographic data for the North Indian Ocean region. High resolution regional model.",
        seed=42
    ),
    "global-ocean-reanalysis": DemoDataGenerator(
        lat_min=-85.0, lat_max=85.0, lon_min=-180.0, lon_max=180.0,
        dataset_id="global-ocean-reanalysis",
        name="Global Ocean Reanalysis",
        description="Global ocean physics reanalysis providing temperature, salinity and currents worldwide.",
        seed=101
    ),
    "pacific-equatorial-dynamics": DemoDataGenerator(
        lat_min=-30.0, lat_max=30.0, lon_min=120.0, lon_max=280.0,
        dataset_id="pacific-equatorial-dynamics",
        name="Pacific Equatorial Dynamics",
        description="Detailed synthetic model of the equatorial Pacific Ocean, focusing on ENSO dynamics.",
        seed=202
    ),
    "north-atlantic-circulation": DemoDataGenerator(
        lat_min=10.0, lat_max=70.0, lon_min=-80.0, lon_max=20.0,
        dataset_id="north-atlantic-circulation",
        name="North Atlantic Circulation",
        description="North Atlantic basin model highlighting the Gulf Stream and AMOC components.",
        seed=303
    )
}
