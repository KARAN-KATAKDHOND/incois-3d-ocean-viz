"""
INCOIS Backend — FastAPI Application Factory

Mounts all v1 API routes, configures CORS middleware,
and bootstraps data directories on startup.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import upload, datasets, slice, profile, insitu


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: ensure all required data directories exist."""
    settings.ensure_dirs()
    yield


app = FastAPI(
    title="INCOIS 3D Ocean Data API",
    description=(
        "Production-grade REST API serving sub-second depth/time slices "
        "from Zarr stores and GeoJSON in-situ observations for the "
        "INCOIS 3D Ocean Visualization Platform."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API v1 Routes ───────────────────────────────────────────────
app.include_router(upload.router, prefix=settings.API_V1_PREFIX)
app.include_router(datasets.router, prefix=settings.API_V1_PREFIX)
app.include_router(slice.router, prefix=settings.API_V1_PREFIX)
app.include_router(profile.router, prefix=settings.API_V1_PREFIX)
app.include_router(insitu.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "INCOIS Ocean Data API",
        "version": "1.0.0",
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health():
    """API v1 health check with storage status."""
    zarr_count = len(list(settings.ZARR_STORE_DIR.glob("*.zarr"))) if settings.ZARR_STORE_DIR.exists() else 0
    geojson_count = len(list(settings.GEOJSON_DIR.glob("*.geojson"))) if settings.GEOJSON_DIR.exists() else 0

    return {
        "status": "healthy",
        "zarr_datasets": zarr_count,
        "insitu_datasets": geojson_count,
        "storage_paths": {
            "zarr": str(settings.ZARR_STORE_DIR),
            "geojson": str(settings.GEOJSON_DIR),
            "uploads": str(settings.UPLOAD_DIR),
        },
    }
