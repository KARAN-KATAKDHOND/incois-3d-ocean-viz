"""
INCOIS Tests — Mock Ocean Data Generator

Synthesizes realistic 4D NetCDF ocean model data and Argo float CSV
profiles for pipeline testing without requiring real multi-GB datasets.

Usage:
    python -m tests.generate_mock_ocean_data
    # or
    python tests/generate_mock_ocean_data.py

Outputs:
    tests/mock_data/mock_ocean_model.nc   — 4D NetCDF (Time, Depth, Lat, Lon)
    tests/mock_data/mock_argo_floats.csv  — Argo float CTD profiles
"""

from __future__ import annotations

from pathlib import Path

import numpy as np


def generate_mock_netcdf(output_path: Path) -> Path:
    """
    Generate a realistic 4D ocean model NetCDF file.

    Dimensions: time=24, depth=10, lat=64, lon=64
    Variables:
      - temperature: SST ~ 28°C at surface, thermocline gradient with depth
      - salinity: ~35 PSU surface, increasing slightly with depth

    Coordinates cover the Arabian Sea / Bay of Bengal region:
      - lat: 5°N to 25°N
      - lon: 65°E to 85°E
      - depth: 0 to -2000m (10 levels)
      - time: 24 hourly steps
    """
    import xarray as xr

    np.random.seed(42)

    # Coordinate arrays
    lat = np.linspace(5.0, 25.0, 64)
    lon = np.linspace(65.0, 85.0, 64)
    depth = np.array([0, -10, -50, -100, -200, -500, -800, -1000, -1500, -2000], dtype=float)
    time = np.arange(24)

    # 4D Temperature field: surface ~28-31°C, thermocline decay with depth
    # Shape: (time, depth, lat, lon)
    temp_surface = 28.0 + 3.0 * np.sin(np.radians(lat[:, None] * 6)) * np.cos(np.radians(lon[None, :] * 3))
    temp_4d = np.zeros((24, 10, 64, 64))

    for t in range(24):
        for d_idx, d_val in enumerate(depth):
            # Exponential decay with depth + diurnal cycle
            depth_factor = np.exp(d_val / 500.0)  # depth is negative
            diurnal = 0.5 * np.sin(2 * np.pi * t / 24.0)
            temp_4d[t, d_idx, :, :] = (
                temp_surface * depth_factor
                + diurnal
                + np.random.normal(0, 0.1, (64, 64))
            )

    # 4D Salinity field: ~35 PSU surface, slight increase with depth
    sal_surface = 34.5 + 0.5 * np.cos(np.radians(lat[:, None] * 4))
    sal_4d = np.zeros((24, 10, 64, 64))

    for t in range(24):
        for d_idx, d_val in enumerate(depth):
            depth_factor = 1.0 + 0.02 * abs(d_val) / 2000.0
            sal_4d[t, d_idx, :, :] = (
                sal_surface * depth_factor
                + np.random.normal(0, 0.05, (64, 64))
            )

    # Build xarray Dataset
    ds = xr.Dataset(
        {
            "temperature": (["time", "depth", "lat", "lon"], temp_4d, {
                "units": "°C",
                "long_name": "Sea Water Temperature",
                "standard_name": "sea_water_temperature",
            }),
            "salinity": (["time", "depth", "lat", "lon"], sal_4d, {
                "units": "PSU",
                "long_name": "Sea Water Salinity",
                "standard_name": "sea_water_salinity",
            }),
        },
        coords={
            "lat": ("lat", lat, {"units": "degrees_north", "axis": "Y"}),
            "lon": ("lon", lon, {"units": "degrees_east", "axis": "X"}),
            "depth": ("depth", depth, {"units": "m", "positive": "up", "axis": "Z"}),
            "time": ("time", time, {"units": "hours since 2025-01-15 00:00:00", "axis": "T"}),
        },
        attrs={
            "title": "Mock INCOIS Ocean Model",
            "Conventions": "CF-1.8",
            "source": "Synthetic test data for INCOIS 3D Viz pipeline",
        },
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(str(output_path))
    print(f"[OK] Generated mock NetCDF: {output_path} ({output_path.stat().st_size / 1024:.0f} KB)")
    return output_path


def generate_mock_argo_csv(output_path: Path) -> Path:
    """
    Generate a synthetic Argo float trajectory CSV.

    5 floats × 20 depth levels = 100 observations
    Columns: id, longitude, latitude, depth, temperature, salinity, timestamp, type
    """
    import pandas as pd

    np.random.seed(123)

    rows = []
    float_ids = ["ARGO_2901", "ARGO_2902", "ARGO_2903", "ARGO_2904", "ARGO_2905"]
    base_positions = [
        (72.5, 15.0), (68.3, 12.5), (75.1, 18.2), (80.0, 10.5), (70.8, 20.1),
    ]
    depths = [0, 5, 10, 25, 50, 75, 100, 150, 200, 300,
              400, 500, 600, 800, 1000, 1200, 1500, 1800, 2000, 2500]

    for i, (fid, (base_lon, base_lat)) in enumerate(zip(float_ids, base_positions)):
        for j, d in enumerate(depths):
            # Simulated drift
            lon = base_lon + np.random.normal(0, 0.1)
            lat = base_lat + np.random.normal(0, 0.1)

            # Temperature profile: warm surface, cold deep
            temp = 28.0 * np.exp(-d / 500.0) + np.random.normal(0, 0.3) + 2.0

            # Salinity profile: ~35 PSU
            sal = 34.5 + 0.5 * (d / 2500.0) + np.random.normal(0, 0.05)

            # Timestamp
            hour = (i * 4 + j) % 24
            timestamp = f"2025-01-15T{hour:02d}:00:00Z"

            rows.append({
                "id": fid,
                "longitude": round(lon, 4),
                "latitude": round(lat, 4),
                "depth": d,
                "temperature": round(temp, 3),
                "salinity": round(sal, 3),
                "timestamp": timestamp,
                "type": "argo",
            })

    df = pd.DataFrame(rows)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(str(output_path), index=False)
    print(f"[OK] Generated mock Argo CSV: {output_path} ({len(df)} observations)")
    return output_path


def main():
    """Generate all mock datasets."""
    mock_dir = Path(__file__).parent / "mock_data"

    nc_path = generate_mock_netcdf(mock_dir / "mock_ocean_model.nc")
    csv_path = generate_mock_argo_csv(mock_dir / "mock_argo_floats.csv")

    print(f"\nAll mock data generated in: {mock_dir}")
    print(f"  NetCDF: {nc_path}")
    print(f"  CSV:    {csv_path}")


if __name__ == "__main__":
    main()
