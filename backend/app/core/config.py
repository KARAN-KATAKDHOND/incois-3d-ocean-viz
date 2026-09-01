"""
INCOIS Backend — Core Configuration

Centralized settings for storage paths, CORS origins, Redis URL,
and Zarr chunking schema. Uses pydantic-settings for .env support.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ─── Project Paths ───────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    ZARR_STORE_DIR: Path = DATA_DIR / "zarr_stores"
    GEOJSON_DIR: Path = DATA_DIR / "geojson"
    PARQUET_DIR: Path = DATA_DIR / "parquet"
    METADATA_DIR: Path = DATA_DIR / "metadata"

    # ─── Redis / Celery ──────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ─── CORS ────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    # ─── Zarr Chunking Schema ────────────────────────────────────────
    ZARR_CHUNK_TIME: int = 1
    ZARR_CHUNK_DEPTH: int = 1
    ZARR_CHUNK_LAT: int = 256
    ZARR_CHUNK_LON: int = 256

    # ─── API ─────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"

    # ─── Pipeline service URL (for triggering tasks from the API) ───
    PIPELINE_URL: str = "http://localhost:8001"

    def ensure_dirs(self) -> None:
        """Create all required data directories if they don't exist."""
        for d in [
            self.UPLOAD_DIR,
            self.ZARR_STORE_DIR,
            self.GEOJSON_DIR,
            self.PARQUET_DIR,
            self.METADATA_DIR,
        ]:
            d.mkdir(parents=True, exist_ok=True)


# Singleton instance
settings = Settings()
