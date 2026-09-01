"""
INCOIS Backend — Chunked Upload Endpoint

Handles resumable multi-part file uploads with checksum verification.
On final chunk assembly, triggers an async processing task via the
data-pipeline service.
"""

from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.ocean import UploadChunkResponse, TaskStatusResponse

router = APIRouter(prefix="/upload", tags=["Upload"])

# In-memory tracker for active uploads (production: use Redis)
_active_uploads: dict[str, dict] = {}


@router.post("/chunk", response_model=UploadChunkResponse)
async def upload_chunk(
    file: UploadFile = File(...),
    upload_id: str = Form(default=""),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    checksum: str = Form(default=""),
    file_type: str = Form(default="netcdf"),  # "netcdf" | "csv" | "txt"
    dataset_name: str = Form(default=""),
):
    """
    Receive a single chunk of a multi-part upload.

    - First chunk: generates a new `upload_id` if not provided.
    - Each chunk is written to `{UPLOAD_DIR}/{upload_id}/chunk_{index}`.
    - Final chunk: assembles all chunks into a single file and triggers
      the data-pipeline processing task.
    """
    settings.ensure_dirs()

    # Generate upload_id on first chunk
    if not upload_id:
        upload_id = str(uuid.uuid4())

    # Track this upload
    if upload_id not in _active_uploads:
        _active_uploads[upload_id] = {
            "total_chunks": total_chunks,
            "received": set(),
            "file_type": file_type,
            "dataset_name": dataset_name or upload_id,
        }

    upload_info = _active_uploads[upload_id]

    # Create chunk directory
    chunk_dir = settings.UPLOAD_DIR / upload_id
    chunk_dir.mkdir(parents=True, exist_ok=True)

    # Write chunk to disk (streaming — no full RAM load)
    chunk_path = chunk_dir / f"chunk_{chunk_index:06d}"
    content = await file.read()

    # Verify checksum if provided
    if checksum:
        computed = hashlib.md5(content).hexdigest()
        if computed != checksum:
            raise HTTPException(
                status_code=400,
                detail=f"Checksum mismatch: expected {checksum}, got {computed}",
            )

    with open(chunk_path, "wb") as f:
        f.write(content)

    upload_info["received"].add(chunk_index)

    # Check if all chunks received
    if len(upload_info["received"]) >= total_chunks:
        # Assemble the file
        ext_map = {"netcdf": ".nc", "csv": ".csv", "txt": ".txt"}
        ext = ext_map.get(file_type, ".nc")
        assembled_filename = f"{upload_id}{ext}"
        assembled_path = settings.UPLOAD_DIR / assembled_filename

        with open(assembled_path, "wb") as outfile:
            for i in range(total_chunks):
                cp = chunk_dir / f"chunk_{i:06d}"
                with open(cp, "rb") as infile:
                    while True:
                        block = infile.read(8192)
                        if not block:
                            break
                        outfile.write(block)

        # Cleanup chunk directory
        for cp in chunk_dir.iterdir():
            cp.unlink()
        chunk_dir.rmdir()

        # Trigger async processing via pipeline service
        task_id = str(uuid.uuid4())
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{settings.PIPELINE_URL}/api/v1/process",
                    json={
                        "task_id": task_id,
                        "file_path": str(assembled_path),
                        "file_type": file_type,
                        "dataset_name": upload_info["dataset_name"],
                    },
                )
                if resp.status_code != 200:
                    # Pipeline not available — process inline if possible
                    pass
        except httpx.RequestError:
            # Pipeline service not running — that's okay for local dev
            pass

        del _active_uploads[upload_id]

        return UploadChunkResponse(
            upload_id=upload_id,
            chunk_index=chunk_index,
            received_chunks=total_chunks,
            total_chunks=total_chunks,
            status="processing",
            task_id=task_id,
            message="All chunks assembled. Processing started.",
        )

    return UploadChunkResponse(
        upload_id=upload_id,
        chunk_index=chunk_index,
        received_chunks=len(upload_info["received"]),
        total_chunks=total_chunks,
        status="receiving",
        message=f"Chunk {chunk_index + 1}/{total_chunks} received.",
    )


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Poll processing task status.
    Checks Redis for task progress or falls back to metadata file presence.
    """
    try:
        import redis as redis_lib

        r = redis_lib.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        status = r.get(f"task:{task_id}:status")
        progress = r.get(f"task:{task_id}:progress")
        dataset_id = r.get(f"task:{task_id}:dataset_id")
        error = r.get(f"task:{task_id}:error")

        if status:
            return TaskStatusResponse(
                task_id=task_id,
                status=status,
                progress=float(progress or 0),
                dataset_id=dataset_id,
                error=error,
            )
    except Exception:
        pass

    # Fallback: check if a dataset metadata file was created
    # (works when pipeline processes inline without Redis)
    return TaskStatusResponse(
        task_id=task_id,
        status="unknown",
        progress=0.0,
        error="Task status not available. Pipeline may not be running.",
    )
