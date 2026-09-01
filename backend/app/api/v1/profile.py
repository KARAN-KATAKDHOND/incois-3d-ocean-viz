"""
INCOIS Backend — Vertical Depth-Profile Endpoint

Extracts a 1D water-column profile (depth vs. variable value)
at the nearest grid point to the requested lat/lon coordinates.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.ocean import ProfileResponse
from app.storage.zarr_reader import zarr_reader

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(
    dataset_id: str = Query(..., description="Dataset identifier"),
    variable: str = Query(..., description="Variable name"),
    lat: float = Query(..., description="Latitude in degrees (WGS84)"),
    lon: float = Query(..., description="Longitude in degrees (WGS84)"),
    time_idx: int = Query(0, ge=0, description="Time step index"),
):
    """
    Extract a vertical depth profile at the nearest grid point.

    Returns `depths[]` (negative meters, ocean convention) and
    `values[]` for plotting depth-vs-variable charts in the frontend.
    Uses xarray's `sel(method='nearest')` for spatial lookup.
    """
    try:
        result = zarr_reader.get_profile(
            dataset_id=dataset_id,
            variable=variable,
            lat=lat,
            lon=lon,
            time_idx=time_idx,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile extraction failed: {e}")

    return ProfileResponse(**result)
