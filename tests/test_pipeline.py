"""
INCOIS Tests — Pipeline Integration Tests

Validates:
  1. NetCDF → Zarr round-trip conversion fidelity
  2. In-situ CSV → GeoJSON/Parquet conversion
  3. Coordinate normalization (CF convention aliases)
  4. Zarr slicing latency (< 150ms target)
  5. JSON serializability (no numpy dtypes, NaN → None)
"""

from __future__ import annotations

import json
import math
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import pytest
import xarray as xr

# Ensure project roots are importable
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "data-pipeline"))
sys.path.insert(0, str(ROOT / "backend"))

from tests.generate_mock_ocean_data import generate_mock_netcdf, generate_mock_argo_csv


# ─── Fixtures ────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def mock_data_dir(tmp_path_factory):
    """Generate mock data once for the entire test session."""
    d = tmp_path_factory.mktemp("mock_data")
    generate_mock_netcdf(d / "mock_ocean_model.nc")
    generate_mock_argo_csv(d / "mock_argo_floats.csv")
    return d


@pytest.fixture(scope="session")
def output_dir(tmp_path_factory):
    """Create temporary output directories."""
    d = tmp_path_factory.mktemp("output")
    (d / "zarr_stores").mkdir()
    (d / "geojson").mkdir()
    (d / "parquet").mkdir()
    (d / "metadata").mkdir()
    return d


# ─── NetCDF Parser Tests ─────────────────────────────────────────

class TestNetCDFParser:
    """Test NetCDF → Zarr conversion."""

    def test_detect_netcdf(self, mock_data_dir):
        from pipeline.parsers.netcdf_parser import NetCDFParser

        parser = NetCDFParser()
        assert parser.detect(mock_data_dir / "mock_ocean_model.nc") is True
        assert parser.detect(mock_data_dir / "mock_argo_floats.csv") is False

    def test_parse_to_zarr(self, mock_data_dir, output_dir):
        from pipeline.parsers.netcdf_parser import NetCDFParser
        from pipeline.core.config import pipeline_settings

        # Point pipeline to temp output dirs
        pipeline_settings.ZARR_STORE_DIR = output_dir / "zarr_stores"
        pipeline_settings.METADATA_DIR = output_dir / "metadata"

        parser = NetCDFParser()
        result = parser.parse(
            file_path=mock_data_dir / "mock_ocean_model.nc",
            dataset_id="test_ocean",
            output_dir=output_dir / "zarr_stores",
        )

        # Verify Zarr store was created
        zarr_path = Path(result["output_path"])
        assert zarr_path.exists()
        assert zarr_path.suffix == ".zarr"

        # Verify metadata was written
        meta_path = Path(result["metadata_path"])
        assert meta_path.exists()

        metadata = result["metadata"]
        assert metadata["dataset_id"] == "test_ocean"
        assert metadata["type"] == "gridded"
        assert "temperature" in metadata["variables"]
        assert "salinity" in metadata["variables"]
        assert len(metadata["depth_levels"]) == 10
        assert metadata["time_steps"] == 24
        assert metadata["bounds"] is not None

    def test_zarr_roundtrip_fidelity(self, mock_data_dir, output_dir):
        """Verify data integrity after NetCDF → Zarr round-trip."""
        # Read original NetCDF
        ds_orig = xr.open_dataset(str(mock_data_dir / "mock_ocean_model.nc"))

        # Read converted Zarr
        zarr_path = output_dir / "zarr_stores" / "test_ocean.zarr"
        ds_zarr = xr.open_zarr(str(zarr_path))

        # Compare dimensions
        assert set(ds_zarr.dims) == set(ds_orig.dims)
        for dim in ds_orig.dims:
            assert ds_zarr.dims[dim] == ds_orig.dims[dim]

        # Compare data variables
        assert set(ds_zarr.data_vars) == set(ds_orig.data_vars)

        # Compare values (within floating point tolerance)
        for var in ds_orig.data_vars:
            np.testing.assert_allclose(
                ds_zarr[var].values,
                ds_orig[var].values,
                rtol=1e-5,
                atol=1e-5,
            )

        ds_orig.close()
        ds_zarr.close()

    def test_coordinate_normalization(self, output_dir):
        """Test that coordinate aliases are properly normalized."""
        # Create a NetCDF with non-standard coordinate names
        import tempfile

        ds = xr.Dataset(
            {"sea_temp": (["time_counter", "nav_lev", "LATITUDE", "LONGITUDE"],
                          np.random.rand(2, 3, 4, 4))},
            coords={
                "LATITUDE": np.linspace(10, 20, 4),
                "LONGITUDE": np.linspace(70, 80, 4),
                "nav_lev": [0, -50, -100],
                "time_counter": [0, 1],
            },
        )

        with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as f:
            ds.to_netcdf(f.name)
            tmp_nc = Path(f.name)

        from pipeline.parsers.netcdf_parser import NetCDFParser
        from pipeline.core.config import pipeline_settings

        pipeline_settings.ZARR_STORE_DIR = output_dir / "zarr_stores"
        pipeline_settings.METADATA_DIR = output_dir / "metadata"

        parser = NetCDFParser()
        result = parser.parse(
            file_path=tmp_nc,
            dataset_id="test_aliases",
            output_dir=output_dir / "zarr_stores",
        )

        # Verify canonical names
        ds_zarr = xr.open_zarr(result["output_path"])
        assert "lat" in ds_zarr.coords
        assert "lon" in ds_zarr.coords
        assert "depth" in ds_zarr.coords
        assert "time" in ds_zarr.coords
        ds_zarr.close()

        # Cleanup
        tmp_nc.unlink()


# ─── In-Situ Parser Tests ────────────────────────────────────────

class TestInSituParser:
    """Test CSV → GeoJSON/Parquet conversion."""

    def test_detect_csv(self, mock_data_dir):
        from pipeline.parsers.in_situ_parser import InSituParser

        parser = InSituParser()
        assert parser.detect(mock_data_dir / "mock_argo_floats.csv") is True
        assert parser.detect(mock_data_dir / "mock_ocean_model.nc") is False

    def test_parse_to_geojson(self, mock_data_dir, output_dir):
        from pipeline.parsers.in_situ_parser import InSituParser
        from pipeline.core.config import pipeline_settings

        pipeline_settings.GEOJSON_DIR = output_dir / "geojson"
        pipeline_settings.PARQUET_DIR = output_dir / "parquet"
        pipeline_settings.METADATA_DIR = output_dir / "metadata"

        parser = InSituParser()
        result = parser.parse(
            file_path=mock_data_dir / "mock_argo_floats.csv",
            dataset_id="test_argo",
        )

        # Verify GeoJSON was created
        geojson_path = Path(result["geojson_path"])
        assert geojson_path.exists()

        with open(geojson_path) as f:
            geojson = json.load(f)

        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) == 100  # 5 floats × 20 depths

        # Verify coordinate order [lon, lat, depth]
        first_coords = geojson["features"][0]["geometry"]["coordinates"]
        assert len(first_coords) == 3
        assert 60 < first_coords[0] < 90  # lon (Indian Ocean)
        assert 0 < first_coords[1] < 30   # lat

        # Verify properties
        props = geojson["features"][0]["properties"]
        assert "id" in props
        assert "temperature" in props

    def test_parquet_output(self, output_dir):
        """Verify Parquet table was created and is readable."""
        import pandas as pd

        parquet_path = output_dir / "parquet" / "test_argo.parquet"
        assert parquet_path.exists()

        df = pd.read_parquet(str(parquet_path))
        assert len(df) == 100
        assert "temperature" in df.columns
        assert "salinity" in df.columns


# ─── Zarr Reader / Slicing Tests ─────────────────────────────────

class TestZarrSlicing:
    """Test Zarr slice and profile extraction."""

    def test_slice_extraction(self, output_dir):
        """Test 2D slice extraction from Zarr store."""
        from app.storage.zarr_reader import ZarrReader

        reader = ZarrReader(
            zarr_dir=output_dir / "zarr_stores",
            metadata_dir=output_dir / "metadata",
        )

        result = reader.get_slice(
            dataset_id="test_ocean",
            variable="temperature",
            depth_idx=0,
            time_idx=0,
        )

        assert result["dataset_id"] == "test_ocean"
        assert result["variable"] == "temperature"
        assert len(result["lat"]) == 64
        assert len(result["lon"]) == 64
        assert len(result["values"]) == 64  # 64 rows
        assert len(result["values"][0]) == 64  # 64 columns
        assert result["stats"]["min"] is not None
        assert result["stats"]["max"] is not None

    def test_slice_latency(self, output_dir):
        """Verify slice extraction completes in < 150ms."""
        from app.storage.zarr_reader import ZarrReader

        reader = ZarrReader(
            zarr_dir=output_dir / "zarr_stores",
            metadata_dir=output_dir / "metadata",
        )

        # Warm up
        reader.get_slice("test_ocean", "temperature", 0, 0)

        # Measure
        start = time.perf_counter()
        for _ in range(10):
            reader.get_slice("test_ocean", "temperature", 0, 0)
        elapsed = (time.perf_counter() - start) / 10

        print(f"Average slice latency: {elapsed * 1000:.1f} ms")
        assert elapsed < 0.150, f"Slice too slow: {elapsed * 1000:.1f} ms (target < 150ms)"

    def test_profile_extraction(self, output_dir):
        """Test vertical depth profile extraction."""
        from app.storage.zarr_reader import ZarrReader

        reader = ZarrReader(
            zarr_dir=output_dir / "zarr_stores",
            metadata_dir=output_dir / "metadata",
        )

        result = reader.get_profile(
            dataset_id="test_ocean",
            variable="temperature",
            lat=15.0,
            lon=72.5,
            time_idx=0,
        )

        assert result["dataset_id"] == "test_ocean"
        assert len(result["depths"]) == 10
        assert len(result["values"]) == 10

        # Temperature should decrease with depth
        surface_temp = result["values"][0]
        deep_temp = result["values"][-1]
        assert surface_temp is not None
        assert deep_temp is not None
        assert surface_temp > deep_temp  # Thermocline

    def test_json_serializability(self, output_dir):
        """Verify no numpy dtypes or NaN values in output."""
        from app.storage.zarr_reader import ZarrReader

        reader = ZarrReader(
            zarr_dir=output_dir / "zarr_stores",
            metadata_dir=output_dir / "metadata",
        )

        result = reader.get_slice("test_ocean", "temperature", 0, 0)

        # Must serialize to JSON without errors
        json_str = json.dumps(result)
        assert "NaN" not in json_str
        assert "Infinity" not in json_str

        # Parse back and verify types
        parsed = json.loads(json_str)
        for row in parsed["values"]:
            for val in row:
                assert val is None or isinstance(val, (int, float))


# ─── Metadata Tests ──────────────────────────────────────────────

class TestMetadata:
    """Test metadata extraction and listing."""

    def test_list_datasets(self, output_dir):
        from app.storage.zarr_reader import ZarrReader

        reader = ZarrReader(
            zarr_dir=output_dir / "zarr_stores",
            metadata_dir=output_dir / "metadata",
        )

        datasets = reader.list_datasets()
        assert len(datasets) >= 1

        # Find our test dataset
        ids = [d["dataset_id"] for d in datasets]
        assert "test_ocean" in ids

    def test_get_metadata(self, output_dir):
        from app.storage.zarr_reader import ZarrReader

        reader = ZarrReader(
            zarr_dir=output_dir / "zarr_stores",
            metadata_dir=output_dir / "metadata",
        )

        meta = reader.get_metadata("test_ocean")
        assert meta is not None
        assert meta["type"] == "gridded"
        assert "temperature" in meta["variables"]
