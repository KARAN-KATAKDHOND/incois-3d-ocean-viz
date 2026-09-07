"""
INCOIS Data Pipeline — FastAPI Process Trigger

A lightweight FastAPI service that receives processing requests from the
backend API server and dispatches them as Celery tasks (or executes
synchronously if Celery/Redis is unavailable).

Run with: uvicorn app.main:app --port 8001
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from pipeline.core.config import pipeline_settings

app = FastAPI(
    title="INCOIS Data Pipeline Service",
    description="Internal processing trigger for NetCDF and in-situ conversions.",
    version="1.0.0",
)


class ProcessRequest(BaseModel):
    """Request to process an uploaded file."""
    task_id: str
    file_path: str
    file_type: str = "netcdf"  # "netcdf" | "csv" | "txt"
    dataset_name: str = ""


@app.post("/api/v1/process")
async def trigger_processing(request: ProcessRequest):
    """
    Trigger async processing of an uploaded file.

    Tries Celery first; falls back to synchronous processing.
    """
    fp = Path(request.file_path)
    if not fp.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {fp}")

    pipeline_settings.ensure_dirs()

    # Force synchronous processing since Celery worker is not running in start.sh
    try:
        from pipeline.tasks import process_file_sync
        result = process_file_sync(
            task_id=request.task_id,
            file_path=request.file_path,
            file_type=request.file_type,
            dataset_name=request.dataset_name,
        )
        return {
            "status": "completed",
            "task_id": request.task_id,
            "mode": "synchronous",
            "result": result,
        }
    except Exception as sync_err:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {sync_err}",
        )


@app.get("/")
async def health():
    return {"status": "healthy", "service": "INCOIS Data Pipeline"}
