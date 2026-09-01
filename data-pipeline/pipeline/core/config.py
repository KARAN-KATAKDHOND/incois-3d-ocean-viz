"""
INCOIS Data Pipeline — Core Configuration

Mirrors backend config paths but adds Celery-specific settings.
Shared data directories ensure both services read/write the same stores.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class PipelineSettings(BaseSettings):
    """Pipeline worker settings."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ─── Shared Data Paths (must match backend config) ───────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    # In production / Docker, DATA_DIR is a shared volume
    DATA_DIR: Path = Path(os.environ.get(
        "SHARED_DATA_DIR",
        str(Path(__file__).resolve().parent.parent.parent.parent / "backend" / "data")
    ))
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    ZARR_STORE_DIR: Path = DATA_DIR / "zarr_stores"
    GEOJSON_DIR: Path = DATA_DIR / "geojson"
    PARQUET_DIR: Path = DATA_DIR / "parquet"
    METADATA_DIR: Path = DATA_DIR / "metadata"

    # ─── Redis / Celery ──────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ─── Zarr Chunking Schema ────────────────────────────────────
    ZARR_CHUNK_TIME: int = 1
    ZARR_CHUNK_DEPTH: int = 1
    ZARR_CHUNK_LAT: int = 256
    ZARR_CHUNK_LON: int = 256

    # ─── Coordinate Alias Maps (CF Conventions) ──────────────────
    LON_ALIASES: list[str] = [
        "longitude", "LONGITUDE", "lon_rho", "lon_u", "lon_v",
        "nav_lon", "x", "X", "LON",
    ]
    LAT_ALIASES: list[str] = [
        "latitude", "LATITUDE", "lat_rho", "lat_u", "lat_v",
        "nav_lat", "y", "Y", "LAT",
    ]
    DEPTH_ALIASES: list[str] = [
        "depth", "DEPTH", "nav_lev", "lev", "level", "z", "Z",
        "s_rho", "sigma", "deptht", "depthw",
    ]
    TIME_ALIASES: list[str] = [
        "time", "TIME", "time_counter", "t", "T", "ocean_time",
    ]

    def ensure_dirs(self) -> None:
        """Create all required data directories."""
        for d in [
            self.UPLOAD_DIR,
            self.ZARR_STORE_DIR,
            self.GEOJSON_DIR,
            self.PARQUET_DIR,
            self.METADATA_DIR,
        ]:
            d.mkdir(parents=True, exist_ok=True)


# Singleton
pipeline_settings = PipelineSettings()
