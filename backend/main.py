"""
Ocean Data Visualization API — FastAPI Application
SIH26067: Interactive 3D Ocean Visualization Platform

This API serves ocean model data and in-situ observations for the
3D visualization frontend. Architecture supports future OPeNDAP integration.
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from services.demo_data import demo_generators
from models.schemas import (
    VariableType, InstrumentType, QualityFlag,
    DatasetMetadata, DatasetListItem,
    VolumeResponse, SliceResponse, IsosurfaceResponse,
    CurrentsResponse, CrossSectionResponse,
    Observation, ProfileResponse,
    ComparisonResult
)

app = FastAPI(
    title="Ocean Visualization API",
    description="SIH26067 — 3D Ocean Data Visualization Platform API. "
                "Serves numerical ocean model outputs and in-situ observations.",
    version="1.0.0-demo",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache observations on startup from all generators
_observations_cache = []
for gen in demo_generators.values():
    _observations_cache.extend(gen.generate_observations())


# === Dataset Endpoints ===

@app.get("/api/datasets", response_model=list[DatasetListItem])
async def list_datasets():
    """List all available datasets."""
    datasets = []
    for gen in demo_generators.values():
        meta = gen.get_dataset_metadata()
        datasets.append({
            "id": meta["id"],
            "name": meta["name"],
            "description": meta["description"],
            "source": meta["source"],
            "variable_count": len(meta["variables"]),
            "is_demo": meta["is_demo"],
            "status": meta["status"]
        })
    return datasets


@app.get("/api/datasets/{dataset_id}", response_model=DatasetMetadata)
async def get_dataset(dataset_id: str):
    """Get dataset metadata."""
    if dataset_id not in demo_generators:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return demo_generators[dataset_id].get_dataset_metadata()


@app.get("/api/datasets/{dataset_id}/variables")
async def get_dataset_variables(dataset_id: str):
    """Get available variables for a dataset."""
    if dataset_id not in demo_generators:
        raise HTTPException(status_code=404, detail="Dataset not found")
    meta = demo_generators[dataset_id].get_dataset_metadata()
    return meta["variables"]


@app.get("/api/datasets/{dataset_id}/times")
async def get_dataset_times(dataset_id: str):
    """Get available time steps."""
    if dataset_id not in demo_generators:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return demo_generators[dataset_id].TIME_STEPS


@app.get("/api/datasets/{dataset_id}/depths")
async def get_dataset_depths(dataset_id: str):
    """Get available depth levels."""
    if dataset_id not in demo_generators:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return demo_generators[dataset_id].DEPTH_LEVELS


# === Model Data Endpoints ===

@app.get("/api/model/volume")
async def get_volume_data(
    dataset_id: str = "north-indian-ocean-demo",
    variable: VariableType = VariableType.TEMPERATURE,
    time_index: int = 0,
    resolution: int = Query(default=32, ge=8, le=64)
):
    """Get 3D volumetric data for visualization."""
    gen_instance = demo_generators.get(dataset_id, demo_generators["north-indian-ocean-demo"])

    generators = {
        VariableType.TEMPERATURE: gen_instance.generate_temperature,
        VariableType.SALINITY: gen_instance.generate_salinity
    }

    if variable == VariableType.CURRENTS:
        return gen_instance.generate_currents(
            n_lat=resolution, n_lon=int(resolution * 1.5),
            time_index=min(time_index, 30)
        )

    gen = generators.get(variable)
    if not gen:
        raise HTTPException(status_code=400, detail=f"Variable {variable} not supported for volume")

    return gen(
        n_lat=resolution, n_lon=int(resolution * 1.5),
        time_index=min(time_index, 30)
    )


@app.get("/api/model/slice")
async def get_slice_data(
    dataset_id: str = "north-indian-ocean-demo",
    variable: VariableType = VariableType.TEMPERATURE,
    depth_index: int = 0,
    time_index: int = 0
):
    """Get 2D depth-slice data."""
    gen_instance = demo_generators.get(dataset_id, demo_generators["north-indian-ocean-demo"])
    depth_index = min(depth_index, len(gen_instance.DEPTH_LEVELS) - 1)

    generators = {
        VariableType.TEMPERATURE: gen_instance.generate_temperature,
        VariableType.SALINITY: gen_instance.generate_salinity
    }

    if variable == VariableType.CURRENTS:
        return gen_instance.generate_currents(
            n_lat=40, n_lon=60,
            time_index=min(time_index, 30),
            depth_index=depth_index
        )

    gen = generators.get(variable)
    if not gen:
        raise HTTPException(status_code=400, detail=f"Variable {variable} not supported")

    result = gen(n_lat=40, n_lon=60, time_index=min(time_index, 30), depth_index=depth_index)
    result["depth"] = gen_instance.DEPTH_LEVELS[depth_index]
    return result


@app.get("/api/model/isosurface")
async def get_isosurface(
    dataset_id: str = "north-indian-ocean-demo",
    variable: VariableType = VariableType.TEMPERATURE,
    threshold: float = 25.0,
    time_index: int = 0
):
    """Get isosurface mesh data using marching-cubes-like extraction."""
    from visualization.isosurface import extract_isosurface

    gen_instance = demo_generators.get(dataset_id, demo_generators["north-indian-ocean-demo"])

    generators = {
        VariableType.TEMPERATURE: gen_instance.generate_temperature,
        VariableType.SALINITY: gen_instance.generate_salinity
    }

    gen = generators.get(variable)
    if not gen:
        raise HTTPException(status_code=400, detail=f"Isosurface not supported for {variable}")

    vol_data = gen(n_lat=24, n_lon=36, time_index=min(time_index, 30))
    return extract_isosurface(vol_data, threshold, variable.value)


@app.get("/api/model/crosssection")
async def get_cross_section(
    dataset_id: str = "north-indian-ocean-demo",
    variable: VariableType = VariableType.TEMPERATURE,
    lat1: float = 8.0, lon1: float = 70.0,
    lat2: float = 22.0, lon2: float = 85.0,
    time_index: int = 0
):
    """Get vertical cross-section data between two geographic points."""
    gen_instance = demo_generators.get(dataset_id, demo_generators["north-indian-ocean-demo"])
    return gen_instance.generate_cross_section(
        variable.value, lat1, lon1, lat2, lon2,
        time_index=min(time_index, 30)
    )


# === Observation Endpoints ===

@app.get("/api/observations", response_model=list[Observation])
async def get_observations(
    instrument_type: Optional[InstrumentType] = None,
    variable: Optional[str] = None,
    lat_min: Optional[float] = None,
    lat_max: Optional[float] = None,
    lon_min: Optional[float] = None,
    lon_max: Optional[float] = None,
    depth_min: Optional[float] = None,
    depth_max: Optional[float] = None,
    quality: Optional[QualityFlag] = None,
    search: Optional[str] = None,
):
    """Get observation instruments with optional filters."""
    obs = _observations_cache

    if instrument_type:
        obs = [o for o in obs if o["instrument_type"] == instrument_type.value]
    if variable:
        obs = [o for o in obs if variable in o["variables"]]
    if lat_min is not None:
        obs = [o for o in obs if o["latitude"] >= lat_min]
    if lat_max is not None:
        obs = [o for o in obs if o["latitude"] <= lat_max]
    if lon_min is not None:
        obs = [o for o in obs if o["longitude"] >= lon_min]
    if lon_max is not None:
        obs = [o for o in obs if o["longitude"] <= lon_max]
    if depth_min is not None:
        obs = [o for o in obs if o["depth"] >= depth_min]
    if depth_max is not None:
        obs = [o for o in obs if o["depth"] <= depth_max]
    if quality:
        obs = [o for o in obs if o["quality"] == quality.value]
    if search:
        search_lower = search.lower()
        obs = [o for o in obs if search_lower in o["id"].lower() or search_lower in o["platform_id"].lower()]

    return obs


@app.get("/api/observations/{obs_id}")
async def get_observation(obs_id: str):
    """Get single observation details."""
    obs = next((o for o in _observations_cache if o["id"] == obs_id), None)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return obs


@app.get("/api/observations/{obs_id}/profile")
async def get_observation_profile(
    obs_id: str,
    variable: VariableType = VariableType.TEMPERATURE
):
    """Get depth-vs-variable profile for an observation."""
    obs = next((o for o in _observations_cache if o["id"] == obs_id), None)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    # Find which generator owns this observation
    for gen in demo_generators.values():
        if obs_id in [o["id"] for o in _observations_cache if o["data_source"].endswith(gen.name) or "Synthetic" in o["data_source"]]:
            pass # Simplification: Just use the first one or default to indian ocean
    
    # Actually, we can just use the indian ocean demo generator for generating the profile 
    # since it creates the synthetic depth curve. Or we can just use the first generator.
    gen_instance = demo_generators["north-indian-ocean-demo"]

    profile_data = gen_instance.generate_profile(obs_id, variable.value)
    profile_data["instrument_type"] = obs["instrument_type"]
    profile_data["latitude"] = obs["latitude"]
    profile_data["longitude"] = obs["longitude"]
    profile_data["timestamp"] = obs["timestamp"]
    return profile_data


# === Comparison Endpoints ===

@app.get("/api/compare")
async def compare_model_observation(
    dataset_id: str = "north-indian-ocean-demo",
    observation_id: str = "",
    variable: VariableType = VariableType.TEMPERATURE,
    time_index: int = 0
):
    """Compare model output with observation data."""
    if not observation_id:
        raise HTTPException(status_code=400, detail="observation_id is required")

    obs = next((o for o in _observations_cache if o["id"] == observation_id), None)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    gen_instance = demo_generators.get(dataset_id, demo_generators["north-indian-ocean-demo"])
    return gen_instance.generate_comparison(observation_id, variable.value)


# === Health ===

@app.get("/api/health")
async def health():
    """API health check."""
    return {"status": "ok", "mode": "demo", "version": "1.0.0-demo"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
