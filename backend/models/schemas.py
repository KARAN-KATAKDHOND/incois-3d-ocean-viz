"""
Pydantic models for the Ocean Visualization API.
Defines all request/response schemas for datasets, observations, and model data.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


# === Enums ===

class VariableType(str, Enum):
    TEMPERATURE = "temperature"
    SALINITY = "salinity"
    CURRENTS = "currents"


class InstrumentType(str, Enum):
    ARGO = "argo"
    GLIDER = "glider"
    CTD = "ctd"
    BGC = "bgc"


class QualityFlag(str, Enum):
    VALID = "valid"
    SUSPECT = "suspect"
    MISSING = "missing"
    INTERPOLATED = "interpolated"


class VisualizationMode(str, Enum):
    VOLUME = "volume"
    DEPTH_SLICE = "depth_slice"
    ISOSURFACE = "isosurface"
    CURRENTS = "currents"


class ScaleType(str, Enum):
    LINEAR = "linear"
    LOGARITHMIC = "logarithmic"


class ColormapName(str, Enum):
    VIRIDIS = "viridis"
    PLASMA = "plasma"
    INFERNO = "inferno"
    TURBO = "turbo"
    COOLWARM = "coolwarm"
    OCEAN = "ocean"


# === Dataset Schemas ===

class SpatialExtent(BaseModel):
    lat_min: float = Field(..., description="Minimum latitude")
    lat_max: float = Field(..., description="Maximum latitude")
    lon_min: float = Field(..., description="Minimum longitude")
    lon_max: float = Field(..., description="Maximum longitude")


class VariableInfo(BaseModel):
    name: VariableType
    display_name: str
    unit: str
    min_value: float
    max_value: float
    description: str


class DatasetMetadata(BaseModel):
    id: str
    name: str
    description: str
    source: str
    variables: list[VariableInfo]
    spatial_extent: SpatialExtent
    time_start: str
    time_end: str
    depth_min: float
    depth_max: float
    depth_levels: list[float]
    time_steps: list[str]
    is_demo: bool = True
    status: str = "loaded"


class DatasetListItem(BaseModel):
    id: str
    name: str
    description: str
    source: str
    variable_count: int
    is_demo: bool = True
    status: str = "loaded"


# === Model Data Schemas ===

class VolumeRequest(BaseModel):
    dataset_id: str = "north-indian-ocean-demo"
    variable: VariableType = VariableType.TEMPERATURE
    time_index: int = 0
    depth_start: Optional[int] = None
    depth_end: Optional[int] = None
    resolution: int = 32


class SliceRequest(BaseModel):
    dataset_id: str = "north-indian-ocean-demo"
    variable: VariableType = VariableType.TEMPERATURE
    depth_index: int = 0
    time_index: int = 0


class IsosurfaceRequest(BaseModel):
    dataset_id: str = "north-indian-ocean-demo"
    variable: VariableType = VariableType.TEMPERATURE
    threshold: float = 25.0
    time_index: int = 0


class CrossSectionRequest(BaseModel):
    dataset_id: str = "north-indian-ocean-demo"
    variable: VariableType = VariableType.TEMPERATURE
    lat1: float
    lon1: float
    lat2: float
    lon2: float
    time_index: int = 0


class VolumeResponse(BaseModel):
    variable: str
    unit: str
    shape: list[int]
    data: list[float]
    lat_range: list[float]
    lon_range: list[float]
    depth_range: list[float]
    min_value: float
    max_value: float
    time: str


class SliceResponse(BaseModel):
    variable: str
    unit: str
    depth: float
    shape: list[int]
    data: list[float]
    lat_range: list[float]
    lon_range: list[float]
    min_value: float
    max_value: float
    time: str


class IsosurfaceResponse(BaseModel):
    variable: str
    unit: str
    threshold: float
    vertices: list[float]
    normals: list[float]
    indices: list[int]
    vertex_count: int


class CrossSectionResponse(BaseModel):
    variable: str
    unit: str
    shape: list[int]
    data: list[float]
    distances: list[float]
    depths: list[float]
    min_value: float
    max_value: float
    start_point: list[float]
    end_point: list[float]


class CurrentsResponse(BaseModel):
    shape: list[int]
    u: list[float]
    v: list[float]
    speed: list[float]
    lat_range: list[float]
    lon_range: list[float]
    depth: float
    min_speed: float
    max_speed: float
    time: str


# === Observation Schemas ===

class Observation(BaseModel):
    id: str
    instrument_type: InstrumentType
    latitude: float
    longitude: float
    depth: float
    timestamp: str
    data_source: str
    quality: QualityFlag
    variables: list[str]
    platform_id: str


class ProfilePoint(BaseModel):
    depth: float
    value: float
    quality: QualityFlag = QualityFlag.VALID


class ProfileResponse(BaseModel):
    observation_id: str
    instrument_type: str
    variable: str
    unit: str
    latitude: float
    longitude: float
    timestamp: str
    profile: list[ProfilePoint]


# === Comparison Schemas ===

class ComparisonRequest(BaseModel):
    dataset_id: str = "north-indian-ocean-demo"
    observation_id: str
    variable: VariableType = VariableType.TEMPERATURE
    time_index: int = 0


class ComparisonResult(BaseModel):
    observation_id: str
    variable: str
    unit: str
    rmse: float
    bias: float
    correlation: float
    n_observations: int
    model_profile: list[ProfilePoint]
    observation_profile: list[ProfilePoint]
    is_demo: bool = True
