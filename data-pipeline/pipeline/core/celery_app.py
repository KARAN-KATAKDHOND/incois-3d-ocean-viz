"""
INCOIS Data Pipeline — Celery Application Factory

Sets up the Celery app with Redis broker, JSON serializer,
and auto-discovery of task modules.
"""

from celery import Celery
from pipeline.core.config import pipeline_settings


def create_celery_app() -> Celery:
    """Create and configure the Celery application."""
    celery_app = Celery(
        "incois_pipeline",
        broker=pipeline_settings.CELERY_BROKER_URL,
        backend=pipeline_settings.CELERY_RESULT_BACKEND,
    )

    celery_app.conf.update(
        # Serialization
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",

        # Task behavior
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,  # One task at a time per worker (memory safety)

        # Result expiry
        result_expires=3600,  # 1 hour

        # Task auto-discovery
        include=["pipeline.tasks"],

        # Timezone
        timezone="UTC",
        enable_utc=True,
    )

    return celery_app


# Singleton Celery app
celery_app = create_celery_app()
