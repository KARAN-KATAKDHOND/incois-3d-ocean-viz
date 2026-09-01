"""
INCOIS Backend — Sub-Second 2D Slice Endpoint

Returns a normalized 2D lat-lon grid extracted from a Zarr store
at a specific depth index and time index. Designed for < 150ms
response time on locally stored Zarr datasets.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.ocean import SliceResponse, SliceStats
from app.storage.zarr_reader import zarr_reader

router = APIRouter(prefix="/slice", tags=["Slice"])


@router.get("", response_model=SliceResponse)
async def get_slice(
    dataset_id: str = Query(..., description="Dataset identifier"),
    variable: str = Query(..., description="Variable name (e.g., 'temperature', 'salinity')"),
    depth_idx: int = Query(0, ge=0, description="Depth level index (0 = surface)"),
    time_idx: int = Query(0, ge=0, description="Time step index"),
):
    """
    Extract a 2D spatial slice from a Zarr store.

    Returns `lat[]`, `lon[]`, and `values[][]` (2D nested array with
    NaN mapped to `null`) for direct canvas texture mapping on the
    CesiumJS globe. Also returns `stats: {min, max, mean}` for
    dynamic colorbar scaling.
    """
    try:
        result = zarr_reader.get_slice(
            dataset_id=dataset_id,
            variable=variable,
            depth_idx=depth_idx,
            time_idx=time_idx,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IndexError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Index out of bounds: {e}. Check depth_idx and time_idx ranges.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slice extraction failed: {e}")

    return SliceResponse(
        dataset_id=result["dataset_id"],
        variable=result["variable"],
        depth_idx=result["depth_idx"],
        time_idx=result["time_idx"],
        lat=result["lat"],
        lon=result["lon"],
        values=result["values"],
        stats=SliceStats(**result["stats"]),
        units=result["units"],
    )
