"""
INCOIS Backend — Datasets Metadata Endpoint

Returns catalog of all processed datasets with their dimensions,
depth levels, variable names, time ranges, and spatial bounds.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.ocean import DatasetMetadata, DatasetListResponse, SpatialBounds
from app.storage.zarr_reader import zarr_reader

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.get("", response_model=DatasetListResponse)
async def list_datasets():
    """
    List all available processed datasets.

    Scans the metadata directory for JSON sidecar files and returns
    a structured catalog for the frontend dataset selector.
    """
    raw_datasets = zarr_reader.list_datasets()
    datasets = []

    for meta in raw_datasets:
        bounds = meta.get("bounds")
        if bounds and isinstance(bounds, dict):
            bounds = SpatialBounds(**bounds)
        else:
            bounds = None

        datasets.append(
            DatasetMetadata(
                dataset_id=meta.get("dataset_id", ""),
                name=meta.get("name", meta.get("dataset_id", "")),
                type=meta.get("type", "gridded"),
                variables=meta.get("variables", []),
                depth_levels=meta.get("depth_levels", []),
                time_steps=meta.get("time_steps", 0),
                time_range=meta.get("time_range"),
                bounds=bounds,
                units=meta.get("units", {}),
            )
        )

    return DatasetListResponse(datasets=datasets)


@router.get("/{dataset_id}", response_model=DatasetMetadata)
async def get_dataset(dataset_id: str):
    """Return metadata for a single dataset."""
    meta = zarr_reader.get_metadata(dataset_id)
    if not meta:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found")

    bounds = meta.get("bounds")
    if bounds and isinstance(bounds, dict):
        bounds = SpatialBounds(**bounds)
    else:
        bounds = None

    return DatasetMetadata(
        dataset_id=meta.get("dataset_id", dataset_id),
        name=meta.get("name", dataset_id),
        type=meta.get("type", "gridded"),
        variables=meta.get("variables", []),
        depth_levels=meta.get("depth_levels", []),
        time_steps=meta.get("time_steps", 0),
        time_range=meta.get("time_range"),
        bounds=bounds,
        units=meta.get("units", {}),
    )
