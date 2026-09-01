"""
INCOIS Backend — Pydantic v2 Schemas for Ocean Data API

Defines response/request models for all API endpoints, ensuring
strict serialization (no numpy dtypes, NaN→null conversion).
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


# ════════════════════════════════════════════════════════════════════
# Dataset Metadata
# ════════════════════════════════════════════════════════════════════

class SpatialBounds(BaseModel):
    """Geographic bounding box of a dataset."""
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float


class DatasetMetadata(BaseModel):
    """Full metadata for a processed dataset."""
    dataset_id: str
    name: str
    type: str = Field(description="'gridded' or 'insitu'")
    variables: list[str] = []
    depth_levels: list[float] = []
    time_steps: int = 0
    time_range: Optional[dict[str, str]] = None  # {"start": "...", "end": "..."}
    bounds: Optional[SpatialBounds] = None
    units: dict[str, str] = {}  # variable_name → unit string


class DatasetListResponse(BaseModel):
    """Response for GET /datasets."""
    datasets: list[DatasetMetadata]


# ════════════════════════════════════════════════════════════════════
# 2D Slice Response
# ════════════════════════════════════════════════════════════════════

class SliceStats(BaseModel):
    """Descriptive statistics for a data slice."""
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None


class SliceResponse(BaseModel):
    """Response for GET /slice — 2D lat-lon grid of values."""
    dataset_id: str
    variable: str
    depth_idx: int
    time_idx: int
    lat: list[float]
    lon: list[float]
    values: list[list[Optional[float]]]  # NaN → null
    stats: SliceStats
    units: str = ""


# ════════════════════════════════════════════════════════════════════
# Vertical Profile Response
# ════════════════════════════════════════════════════════════════════

class ProfileResponse(BaseModel):
    """Response for GET /profile — 1D vertical water-column profile."""
    dataset_id: str
    variable: str
    lat: float
    lon: float
    time_idx: int
    depths: list[float]
    values: list[Optional[float]]  # NaN → null
    units: str = ""


# ════════════════════════════════════════════════════════════════════
# In-Situ GeoJSON Response
# ════════════════════════════════════════════════════════════════════

class GeoJSONGeometry(BaseModel):
    """GeoJSON Point geometry with optional altitude (depth)."""
    type: str = "Point"
    coordinates: list[float]  # [lon, lat, depth]


class GeoJSONProperties(BaseModel):
    """Properties for an in-situ observation point."""
    id: str
    instrument_type: str = ""
    timestamp: Optional[str] = None
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    pressure: Optional[float] = None


class GeoJSONFeature(BaseModel):
    """A single GeoJSON feature."""
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: GeoJSONProperties


class InSituPointsResponse(BaseModel):
    """Response for GET /insitu/points — GeoJSON FeatureCollection."""
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]


# ════════════════════════════════════════════════════════════════════
# Upload & Task Tracking
# ════════════════════════════════════════════════════════════════════

class UploadChunkResponse(BaseModel):
    """Response for POST /upload/chunk."""
    upload_id: str
    chunk_index: int
    received_chunks: int
    total_chunks: int
    status: str = "receiving"  # "receiving" | "assembled" | "processing" | "complete" | "error"
    task_id: Optional[str] = None
    message: str = ""


class TaskStatusResponse(BaseModel):
    """Response for GET /upload/status."""
    task_id: str
    status: str  # "pending" | "processing" | "complete" | "error"
    progress: float = 0.0  # 0.0 → 1.0
    dataset_id: Optional[str] = None
    error: Optional[str] = None
