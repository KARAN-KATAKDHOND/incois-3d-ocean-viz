"""
INCOIS Tests — API Integration Tests

Tests all REST endpoints using FastAPI's TestClient (httpx-based).
Requires mock data to have been processed first.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure project roots are importable
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "data-pipeline"))


@pytest.fixture(scope="session")
def prepared_data(tmp_path_factory):
    """Generate mock data and process it into Zarr/GeoJSON for API testing."""
    mock_dir = tmp_path_factory.mktemp("api_test_data")
    output_dir = tmp_path_factory.mktemp("api_test_output")

    # Sub-directories
    zarr_dir = output_dir / "zarr_stores"
    geojson_dir = output_dir / "geojson"
    parquet_dir = output_dir / "parquet"
    metadata_dir = output_dir / "metadata"
    upload_dir = output_dir / "uploads"

    for d in [zarr_dir, geojson_dir, parquet_dir, metadata_dir, upload_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Generate mock data
    from tests.generate_mock_ocean_data import generate_mock_netcdf, generate_mock_argo_csv

    nc_path = generate_mock_netcdf(mock_dir / "mock_ocean.nc")
    csv_path = generate_mock_argo_csv(mock_dir / "mock_argo.csv")

    # Process NetCDF → Zarr
    from pipeline.parsers.netcdf_parser import NetCDFParser
    from pipeline.parsers.in_situ_parser import InSituParser
    from pipeline.core.config import pipeline_settings

    pipeline_settings.ZARR_STORE_DIR = zarr_dir
    pipeline_settings.GEOJSON_DIR = geojson_dir
    pipeline_settings.PARQUET_DIR = parquet_dir
    pipeline_settings.METADATA_DIR = metadata_dir

    netcdf_parser = NetCDFParser()
    netcdf_parser.parse(nc_path, "mock_ocean", zarr_dir)

    insitu_parser = InSituParser()
    insitu_parser.parse(csv_path, "mock_argo")

    return {
        "zarr_dir": zarr_dir,
        "geojson_dir": geojson_dir,
        "metadata_dir": metadata_dir,
        "upload_dir": upload_dir,
    }


@pytest.fixture(scope="session")
def client(prepared_data):
    """Create a FastAPI TestClient with paths pointed to test data."""
    from app.core.config import settings

    settings.ZARR_STORE_DIR = prepared_data["zarr_dir"]
    settings.GEOJSON_DIR = prepared_data["geojson_dir"]
    settings.METADATA_DIR = prepared_data["metadata_dir"]
    settings.UPLOAD_DIR = prepared_data["upload_dir"]

    # Re-initialize the zarr_reader singleton with correct paths
    from app.storage.zarr_reader import ZarrReader, zarr_reader
    zarr_reader.__init__(
        zarr_dir=prepared_data["zarr_dir"],
        metadata_dir=prepared_data["metadata_dir"],
    )

    from app.main import app
    return TestClient(app)


# ─── Health Check ─────────────────────────────────────────────────

class TestHealthCheck:

    def test_root_health(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_api_health(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["zarr_datasets"] >= 1


# ─── Datasets Endpoint ───────────────────────────────────────────

class TestDatasetsEndpoint:

    def test_list_datasets(self, client):
        resp = client.get("/api/v1/datasets")
        assert resp.status_code == 200
        data = resp.json()
        assert "datasets" in data
        assert len(data["datasets"]) >= 1

        # Find mock_ocean
        ids = [d["dataset_id"] for d in data["datasets"]]
        assert "mock_ocean" in ids

    def test_get_single_dataset(self, client):
        resp = client.get("/api/v1/datasets/mock_ocean")
        assert resp.status_code == 200
        data = resp.json()
        assert data["dataset_id"] == "mock_ocean"
        assert "temperature" in data["variables"]
        assert len(data["depth_levels"]) == 10

    def test_dataset_not_found(self, client):
        resp = client.get("/api/v1/datasets/nonexistent")
        assert resp.status_code == 404


# ─── Slice Endpoint ──────────────────────────────────────────────

class TestSliceEndpoint:

    def test_get_slice(self, client):
        resp = client.get("/api/v1/slice", params={
            "dataset_id": "mock_ocean",
            "variable": "temperature",
            "depth_idx": 0,
            "time_idx": 0,
        })
        assert resp.status_code == 200
        data = resp.json()

        assert data["dataset_id"] == "mock_ocean"
        assert data["variable"] == "temperature"
        assert len(data["lat"]) == 64
        assert len(data["lon"]) == 64
        assert len(data["values"]) == 64
        assert data["stats"]["min"] is not None
        assert data["stats"]["max"] is not None
        assert data["stats"]["mean"] is not None

    def test_slice_no_nan_in_json(self, client):
        resp = client.get("/api/v1/slice", params={
            "dataset_id": "mock_ocean",
            "variable": "temperature",
            "depth_idx": 0,
            "time_idx": 0,
        })
        raw = resp.text
        assert "NaN" not in raw
        assert "Infinity" not in raw

    def test_slice_invalid_variable(self, client):
        resp = client.get("/api/v1/slice", params={
            "dataset_id": "mock_ocean",
            "variable": "nonexistent_var",
            "depth_idx": 0,
            "time_idx": 0,
        })
        assert resp.status_code == 400

    def test_slice_dataset_not_found(self, client):
        resp = client.get("/api/v1/slice", params={
            "dataset_id": "nonexistent",
            "variable": "temperature",
        })
        assert resp.status_code == 404


# ─── Profile Endpoint ────────────────────────────────────────────

class TestProfileEndpoint:

    def test_get_profile(self, client):
        resp = client.get("/api/v1/profile", params={
            "dataset_id": "mock_ocean",
            "variable": "temperature",
            "lat": 15.0,
            "lon": 72.5,
            "time_idx": 0,
        })
        assert resp.status_code == 200
        data = resp.json()

        assert data["dataset_id"] == "mock_ocean"
        assert len(data["depths"]) == 10
        assert len(data["values"]) == 10

        # Temperature should decrease with depth
        assert data["values"][0] > data["values"][-1]

    def test_profile_dataset_not_found(self, client):
        resp = client.get("/api/v1/profile", params={
            "dataset_id": "nonexistent",
            "variable": "temperature",
            "lat": 15.0,
            "lon": 72.5,
        })
        assert resp.status_code == 404


# ─── In-Situ Endpoint ────────────────────────────────────────────

class TestInSituEndpoint:

    def test_get_insitu_points(self, client):
        resp = client.get("/api/v1/insitu/points", params={
            "dataset_id": "mock_argo",
        })
        assert resp.status_code == 200
        data = resp.json()

        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 100

        # Check first feature structure
        feat = data["features"][0]
        assert feat["type"] == "Feature"
        assert feat["geometry"]["type"] == "Point"
        assert len(feat["geometry"]["coordinates"]) == 3
        assert "id" in feat["properties"]

    def test_insitu_not_found(self, client):
        resp = client.get("/api/v1/insitu/points", params={
            "dataset_id": "nonexistent",
        })
        assert resp.status_code == 404

    def test_list_insitu_datasets(self, client):
        resp = client.get("/api/v1/insitu/list")
        assert resp.status_code == 200
        data = resp.json()
        assert "datasets" in data
