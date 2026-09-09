"""
Ocean Intelligence — Anomaly Detection Service

Z-score based anomaly detection against period mean,
with confidence scoring and spatial anomaly maps.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from .statistics import _open_zarr, _extract_time_series, get_variable_meta

logger = logging.getLogger(__name__)


def _classify_anomaly(z_score: float) -> str:
    """Classify anomaly severity based on Z-score."""
    az = abs(z_score)
    if az >= 2.0:
        return "significant"
    elif az >= 1.0:
        return "moderate"
    return "normal"


def _anomaly_confidence(n_obs: int, std: float, z_score: float) -> dict:
    """Compute confidence in the anomaly detection."""
    reasons = []

    if n_obs >= 20:
        obs_score = "high"
        reasons.append(f"Sufficient observations (N={n_obs})")
    elif n_obs >= 7:
        obs_score = "medium"
        reasons.append(f"Moderate observation count (N={n_obs})")
    else:
        obs_score = "low"
        reasons.append(f"Limited observations (N={n_obs})")

    if std > 1e-10:
        var_score = "high"
    else:
        var_score = "low"
        reasons.append("Near-zero variance — anomaly detection unreliable")

    az = abs(z_score)
    if az >= 3.0:
        sig_score = "high"
        reasons.append(f"Strong statistical signal (|Z|={az:.2f})")
    elif az >= 2.0:
        sig_score = "medium"
        reasons.append(f"Moderate statistical signal (|Z|={az:.2f})")
    elif az >= 1.0:
        sig_score = "low"
        reasons.append(f"Weak statistical signal (|Z|={az:.2f})")
    else:
        sig_score = "low"
        reasons.append(f"Within normal range (|Z|={az:.2f})")

    # Overall confidence
    scores = {"high": 3, "medium": 2, "low": 1}
    avg = (scores[obs_score] + scores[var_score] + scores[sig_score]) / 3
    if avg >= 2.5:
        overall = "high"
    elif avg >= 1.5:
        overall = "medium"
    else:
        overall = "low"

    return {"level": overall, "reasons": reasons}


def detect_anomalies(
    dataset_id: str,
    variable: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Detect anomalies in a time series using Z-score method.

    For each time step, computes the Z-score relative to the
    period mean and standard deviation.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    times, values = _extract_time_series(
        ds, variable, start_idx, end_idx, lat, lon, depth
    )
    ds.close()

    if len(values) < 3:
        return None

    mean_val = float(np.mean(values))
    std_val = float(np.std(values))
    meta = get_variable_meta(variable)

    # Per-timestep anomaly analysis
    daily = []
    for i, (t, v) in enumerate(zip(times, values)):
        z = (v - mean_val) / std_val if std_val > 1e-10 else 0.0
        status = _classify_anomaly(z)
        confidence = _anomaly_confidence(len(values), std_val, z)

        daily.append({
            "time": str(t),
            "time_index": start_idx + i,
            "observed": round(float(v), 4),
            "expected": round(mean_val, 4),
            "difference": round(float(v - mean_val), 4),
            "z_score": round(z, 4),
            "status": status,
            "confidence": confidence["level"],
        })

    # Count anomalies
    n_significant = sum(1 for d in daily if d["status"] == "significant")
    n_moderate = sum(1 for d in daily if d["status"] == "moderate")
    n_normal = sum(1 for d in daily if d["status"] == "normal")

    # Most anomalous day
    most_anomalous = max(daily, key=lambda x: abs(x["z_score"]))

    # Overall assessment
    if n_significant > 0:
        overall_status = "significant"
    elif n_moderate > len(daily) * 0.3:
        overall_status = "moderate"
    else:
        overall_status = "normal"

    overall_confidence = _anomaly_confidence(len(values), std_val,
                                              most_anomalous["z_score"])

    return {
        "variable": variable,
        "display_name": meta["display"],
        "unit": meta["unit"],
        "period_mean": round(mean_val, 4),
        "period_std": round(std_val, 4),
        "overall_status": overall_status,
        "overall_confidence": overall_confidence,
        "n_significant": n_significant,
        "n_moderate": n_moderate,
        "n_normal": n_normal,
        "most_anomalous": most_anomalous,
        "daily": daily,
    }


def compute_spatial_anomaly(
    dataset_id: str,
    variable: str,
    time_idx: int = -1,
    depth_index: int = 0,
) -> Optional[dict]:
    """
    Compute spatial anomaly map: value at time_idx minus the temporal mean.

    Returns a 2D grid of anomaly values for the given depth level.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    if variable == "current_speed":
        u_var = "u" if "u" in ds.data_vars else ("uo" if "uo" in ds.data_vars else None)
        v_var = "v" if "v" in ds.data_vars else ("vo" if "vo" in ds.data_vars else None)
        if u_var is None or v_var is None:
            ds.close()
            return None
        speed = np.sqrt(ds[u_var] ** 2 + ds[v_var] ** 2)
        speed.name = "current_speed"
        ds = ds.assign(current_speed=speed)

    if variable not in ds.data_vars:
        ds.close()
        return None

    da = ds[variable]

    # Select depth
    if "depth" in da.dims:
        n_d = len(ds.depth)
        di = min(max(0, depth_index), n_d - 1)
        da = da.isel(depth=di)

    if "time" not in da.dims or len(ds.time) < 2:
        ds.close()
        return None

    # Compute temporal mean
    temporal_mean = da.mean(dim="time")

    # Select target time
    n_t = len(ds.time)
    if time_idx < 0:
        time_idx = n_t + time_idx
    time_idx = min(max(0, time_idx), n_t - 1)

    snapshot = da.isel(time=time_idx)
    anomaly = snapshot - temporal_mean

    anom_vals = np.nan_to_num(anomaly.values.flatten(), nan=0.0)

    meta = get_variable_meta(variable)
    lats = ds.lat.values.tolist()
    lons = ds.lon.values.tolist()

    ds.close()

    return {
        "variable": variable,
        "display_name": meta["display"],
        "unit": meta["unit"],
        "time": str(ds.time.isel(time=time_idx).values) if "time" in ds.coords else "",
        "shape": list(anomaly.values.shape),
        "data": [round(float(v), 4) for v in anom_vals[:2000]],
        "min_anomaly": round(float(np.min(anom_vals)), 4),
        "max_anomaly": round(float(np.max(anom_vals)), 4),
        "mean_anomaly": round(float(np.mean(anom_vals)), 4),
        "lats": [round(v, 4) for v in lats],
        "lons": [round(v, 4) for v in lons],
    }
