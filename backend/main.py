"""
Ocean Data Visualization API — FastAPI Application
SIH26067: Interactive 3D Ocean Visualization Platform

This API serves ocean model data and in-situ observations for the
3D visualization frontend. Architecture supports future OPeNDAP integration.
"""
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
import shutil
from pathlib import Path

from services.real_data import real_data_manager
from models.schemas import (
    InstrumentType, QualityFlag,
    DatasetMetadata, DatasetListItem,
    Observation, ProfileResponse, ComparisonResult
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


# === Pipeline & Upload Endpoints ===

@app.post("/api/upload")
async def upload_data_file(file: UploadFile = File(...)):
    """
    Upload a NetCDF or CSV file and trigger the data pipeline.
    """
    uploads_dir = Path("data/uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = uploads_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    dataset_name = file_path.stem
    
    # Forward to pipeline
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            file_type = "csv" if file.filename.lower().endswith(".csv") else "netcdf"
            response = await client.post(
                "http://localhost:8001/api/v1/process",
                json={
                    "task_id": f"upload_{dataset_name}",
                    "file_path": str(file_path.absolute()), 
                    "dataset_name": dataset_name,
                    "file_type": file_type
                },
                timeout=60.0
            )
            response.raise_for_status()
            return {"status": "success", "message": f"File {file.filename} uploaded and sent to pipeline", "pipeline_response": response.json()}
    except Exception as e:
        # We will ignore pipeline connection errors for now just in case the pipeline is still booting
        return {"status": "warning", "message": f"File {file.filename} uploaded but pipeline failed: {str(e)}"}


@app.post("/api/process")
async def trigger_pipeline(request_data: dict):
    """
    Forward processing requests to the internal data-pipeline service.
    """
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8001/api/v1/process",
                json=request_data,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Data pipeline unreachable: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)

@app.get("/api/data/files")
async def list_local_files():
    """List raw NetCDF and CSV files available on the server for processing."""
    original_dir = Path("data/original")
    files = []
    if original_dir.exists():
        for file in original_dir.iterdir():
            if file.is_file() and file.suffix in [".nc", ".nc4", ".csv"]:
                size_mb = round(file.stat().st_size / (1024 * 1024), 2)
                files.append({
                    "name": file.name,
                    "size_mb": size_mb,
                    "type": file.suffix
                })
    return files


@app.post("/api/data/process/{filename}")
async def process_local_file(filename: str):
    """Trigger processing for a file in data/original/."""
    file_path = Path("data/original") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
        
    dataset_name = file_path.stem
    file_type = "csv" if filename.lower().endswith(".csv") else "netcdf"
    
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8001/api/v1/process",
                json={
                    "task_id": f"process_local_{dataset_name}",
                    "file_path": str(file_path.absolute()), 
                    "dataset_name": dataset_name,
                    "file_type": file_type
                },
                timeout=60.0
            )
            response.raise_for_status()
            return {"status": "success", "message": f"Started processing {filename}"}
    except Exception as e:
        return {"status": "error", "message": f"Pipeline failed: {str(e)}"}


# === Dataset Endpoints ===

@app.get("/api/datasets", response_model=list[DatasetListItem])
async def list_datasets():
    """List all available datasets from Zarr metadata."""
    meta_dir = Path("data/metadata")
    datasets = []
    if meta_dir.exists():
        for file in meta_dir.glob("*.json"):
            meta = real_data_manager.get_dataset_metadata(file.stem)
            if meta:
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
    meta = real_data_manager.get_dataset_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return meta


@app.get("/api/datasets/{dataset_id}/variables")
async def get_dataset_variables(dataset_id: str):
    """Get available variables for a dataset."""
    meta = real_data_manager.get_dataset_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return meta["variables"]


@app.get("/api/datasets/{dataset_id}/times")
async def get_dataset_times(dataset_id: str):
    """Get available time steps."""
    meta = real_data_manager.get_dataset_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return meta["time_steps"]


@app.get("/api/datasets/{dataset_id}/depths")
async def get_dataset_depths(dataset_id: str):
    """Get available depth levels."""
    meta = real_data_manager.get_dataset_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return meta["depth_levels"]


# === Model Data Endpoints ===

@app.get("/api/model/volume")
async def get_volume_data(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    time_index: int = 0,
    resolution: int = Query(default=32, ge=8, le=64)
):
    """Get 3D volumetric data for visualization."""
    if variable == "currents":
        result = real_data_manager.generate_currents(
            dataset_id=dataset_id,
            time_index=time_index,
            n_lat=resolution,
            n_lon=int(resolution * 1.5)
        )
        if not result:
            return {"u": [], "v": [], "speed": [], "shape": [1,1,1]}
        return result

    result = real_data_manager.generate_volume(
        dataset_id=dataset_id, 
        variable=variable, 
        time_index=time_index, 
        n_lat=resolution, 
        n_lon=int(resolution * 1.5)
    )
    if not result:
        # Fallback empty response instead of error to keep UI rendering
        return {"data": [], "shape": [1,1,1], "variable": variable, "unit": ""}
    return result


@app.get("/api/model/slice")
async def get_slice_data(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    depth_index: int = 0,
    time_index: int = 0
):
    """Get 2D depth-slice data."""
    if variable in ["currents", "uo", "vo", "usi", "vsi"]:
        result = real_data_manager.generate_currents(
            dataset_id=dataset_id,
            variable=variable,
            time_index=time_index,
            depth_index=depth_index
        )
        if not result:
            return {"u": [], "v": [], "speed": [], "shape": [1,1]}
        return result

    result = real_data_manager.generate_slice(
        dataset_id=dataset_id,
        variable=variable,
        depth_index=depth_index,
        time_index=time_index
    )
    if not result:
        return {"data": [], "shape": [1,1], "variable": variable, "unit": ""}
    return result


@app.get("/api/model/isosurface")
async def get_isosurface(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    threshold: float = 25.0,
    time_index: int = 0
):
    """Get isosurface mesh data using marching-cubes-like extraction."""
    from visualization.isosurface import extract_isosurface
    vol_data = real_data_manager.generate_volume(
        dataset_id=dataset_id,
        variable=variable,
        time_index=time_index,
        n_lat=24, n_lon=36
    )
    if not vol_data:
        return {"vertices": [], "indices": [], "values": [], "variable": variable}
    
    return extract_isosurface(vol_data, threshold, variable)


@app.get("/api/model/crosssection")
async def get_cross_section(
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    lat1: float = 8.0, lon1: float = 70.0,
    lat2: float = 22.0, lon2: float = 85.0,
    time_index: int = 0
):
    """Get vertical cross-section data between two geographic points."""
    result = real_data_manager.generate_crosssection(
        dataset_id=dataset_id,
        variable=variable,
        lat1=lat1, lon1=lon1,
        lat2=lat2, lon2=lon2,
        time_index=time_index,
        num_points=50
    )
    if not result:
        raise HTTPException(status_code=404, detail="Failed to generate cross section")
    return result


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
    obs = real_data_manager.generate_observations()

    if instrument_type:
        obs = [o for o in obs if o["instrument_type"] == instrument_type.value]
    if lat_min is not None:
        obs = [o for o in obs if o["latitude"] >= lat_min]
    if lat_max is not None:
        obs = [o for o in obs if o["latitude"] <= lat_max]
    if lon_min is not None:
        obs = [o for o in obs if o["longitude"] >= lon_min]
    if lon_max is not None:
        obs = [o for o in obs if o["longitude"] <= lon_max]
    
    return obs


@app.get("/api/observations/{obs_id}")
async def get_observation(obs_id: str):
    """Get single observation details."""
    obs_list = real_data_manager.generate_observations()
    obs = next((o for o in obs_list if o["id"] == obs_id), None)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return obs


@app.get("/api/observations/{obs_id}/profile")
async def get_observation_profile(
    obs_id: str,
    variable: str = "temperature"
):
    """Get depth-vs-variable profile for an observation."""
    profile = real_data_manager.generate_profile(obs_id, variable)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# === Comparison Endpoints ===

@app.get("/api/compare", response_model=ComparisonResult)
async def compare_model_vs_observation(
    observation_id: str,
    dataset_id: str = "noaa_sst_real",
    variable: str = "temperature",
    time_index: int = 0
):
    """Get statistical comparison between model data and in-situ observation."""
    result = real_data_manager.generate_comparison(
        dataset_id=dataset_id,
        obs_id=observation_id,
        variable=variable
    )
    if not result:
        raise HTTPException(status_code=404, detail="Comparison could not be generated")
    return result


# === Health ===

@app.get("/api/health")
async def health():
    """API health check."""
    return {"status": "ok", "mode": "real_data", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
