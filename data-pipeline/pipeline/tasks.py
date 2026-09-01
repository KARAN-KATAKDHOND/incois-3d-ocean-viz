"""
INCOIS Data Pipeline — Celery Async Tasks

Defines the asynchronous processing tasks that convert raw uploads
into optimized storage formats (Zarr, GeoJSON, Parquet).

Tasks update their progress via Redis keys for frontend polling.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import redis

from pipeline.core.celery_app import celery_app
from pipeline.core.config import pipeline_settings
from pipeline.parsers.netcdf_parser import NetCDFParser
from pipeline.parsers.in_situ_parser import InSituParser

logger = logging.getLogger(__name__)

# Parser instances
_netcdf_parser = NetCDFParser()
_insitu_parser = InSituParser()


def _get_redis() -> Optional[redis.Redis]:
    """Get Redis connection for progress tracking. Returns None if unavailable."""
    try:
        r = redis.Redis.from_url(pipeline_settings.REDIS_URL, decode_responses=True)
        r.ping()
        return r
    except Exception:
        return None


def _update_progress(task_id: str, status: str, progress: float,
                     dataset_id: str = "", error: str = ""):
    """Update task progress in Redis."""
    r = _get_redis()
    if r:
        pipe = r.pipeline()
        pipe.set(f"task:{task_id}:status", status)
        pipe.set(f"task:{task_id}:progress", str(progress))
        if dataset_id:
            pipe.set(f"task:{task_id}:dataset_id", dataset_id)
        if error:
            pipe.set(f"task:{task_id}:error", error)
        # Expire after 1 hour
        for key in [f"task:{task_id}:status", f"task:{task_id}:progress",
                     f"task:{task_id}:dataset_id", f"task:{task_id}:error"]:
            pipe.expire(key, 3600)
        pipe.execute()


@celery_app.task(bind=True, name="process_netcdf")
def process_netcdf_upload(self, task_id: str, file_path: str,
                          dataset_name: str = ""):
    """
    Celery task: Convert a NetCDF file to a consolidated Zarr store.

    Updates progress in Redis as the conversion proceeds.
    """
    fp = Path(file_path)
    dataset_id = dataset_name or fp.stem

    # Sanitize dataset_id for filesystem safety
    dataset_id = "".join(c if c.isalnum() or c in "_-" else "_" for c in dataset_id)

    logger.info(f"[Task {task_id}] Starting NetCDF conversion: {fp}")
    _update_progress(task_id, "processing", 0.0, dataset_id)

    try:
        def progress_cb(p: float):
            _update_progress(task_id, "processing", p, dataset_id)

        result = _netcdf_parser.parse(
            file_path=fp,
            dataset_id=dataset_id,
            progress_callback=progress_cb,
        )

        _update_progress(task_id, "complete", 1.0, dataset_id)
        logger.info(f"[Task {task_id}] NetCDF conversion complete: {dataset_id}")
        return result

    except Exception as e:
        logger.error(f"[Task {task_id}] NetCDF conversion failed: {e}")
        _update_progress(task_id, "error", 0.0, dataset_id, str(e))
        raise


@celery_app.task(bind=True, name="process_insitu")
def process_insitu_upload(self, task_id: str, file_path: str,
                          dataset_name: str = ""):
    """
    Celery task: Convert a CSV/TXT in-situ file to GeoJSON + Parquet.
    """
    fp = Path(file_path)
    dataset_id = dataset_name or fp.stem
    dataset_id = "".join(c if c.isalnum() or c in "_-" else "_" for c in dataset_id)

    logger.info(f"[Task {task_id}] Starting in-situ conversion: {fp}")
    _update_progress(task_id, "processing", 0.0, dataset_id)

    try:
        def progress_cb(p: float):
            _update_progress(task_id, "processing", p, dataset_id)

        result = _insitu_parser.parse(
            file_path=fp,
            dataset_id=dataset_id,
            progress_callback=progress_cb,
        )

        _update_progress(task_id, "complete", 1.0, dataset_id)
        logger.info(f"[Task {task_id}] In-situ conversion complete: {dataset_id}")
        return result

    except Exception as e:
        logger.error(f"[Task {task_id}] In-situ conversion failed: {e}")
        _update_progress(task_id, "error", 0.0, dataset_id, str(e))
        raise


def process_file_sync(task_id: str, file_path: str,
                      file_type: str = "netcdf", dataset_name: str = "") -> dict:
    """
    Synchronous fallback: process a file directly without Celery.
    Used when Redis/Celery is not available (local dev mode).
    """
    if file_type in ("csv", "txt"):
        return process_insitu_upload(
            task_id=task_id,
            file_path=file_path,
            dataset_name=dataset_name,
        )
    else:
        return process_netcdf_upload(
            task_id=task_id,
            file_path=file_path,
            dataset_name=dataset_name,
        )
