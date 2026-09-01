"""
INCOIS Backend — In-Situ Points Endpoint

Returns GeoJSON FeatureCollections of processed in-situ
observations (Argo floats, underwater gliders) with 3D
coordinates [lon, lat, depth] and property readings.
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.schemas.ocean import InSituPointsResponse

router = APIRouter(prefix="/insitu", tags=["In-Situ"])


@router.get("/points", response_model=InSituPointsResponse)
async def get_insitu_points(
    dataset_id: str = Query(..., description="In-situ dataset identifier"),
):
    """
    Return GeoJSON FeatureCollection for an in-situ dataset.

    Each feature contains:
    - geometry: Point with [lon, lat, depth]
    - properties: id, instrument_type, timestamp, temperature, salinity, pressure
    """
    geojson_path = settings.GEOJSON_DIR / f"{dataset_id}.geojson"

    if not geojson_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"In-situ dataset '{dataset_id}' not found at {geojson_path}",
        )

    try:
        with open(geojson_path, "r") as f:
            geojson_data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read GeoJSON file: {e}",
        )

    return InSituPointsResponse(**geojson_data)


@router.get("/list")
async def list_insitu_datasets():
    """List all available in-situ datasets."""
    if not settings.GEOJSON_DIR.exists():
        return {"datasets": []}

    datasets = []
    for f in sorted(settings.GEOJSON_DIR.glob("*.geojson")):
        datasets.append({
            "dataset_id": f.stem,
            "name": f.stem.replace("_", " ").title(),
            "type": "insitu",
        })

    return {"datasets": datasets}
