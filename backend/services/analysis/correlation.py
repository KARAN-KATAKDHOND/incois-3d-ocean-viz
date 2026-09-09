"""
Ocean Intelligence — Correlation Analysis Service

Computes pairwise Pearson/Spearman correlations, full NxN correlation
matrices, and lagged cross-correlations between oceanographic variables.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from .statistics import _open_zarr, _extract_time_series, get_variable_meta

logger = logging.getLogger(__name__)


def _classify_strength(r: float) -> str:
    """Classify correlation strength."""
    ar = abs(r)
    if ar >= 0.7:
        return "strong"
    elif ar >= 0.4:
        return "moderate"
    elif ar >= 0.2:
        return "weak"
    else:
        return "negligible"


def _classify_direction(r: float) -> str:
    """Classify correlation direction."""
    if abs(r) < 0.1:
        return "negligible"
    return "positive" if r > 0 else "negative"


def _generate_relationship_text(var_a: str, var_b: str, r: float, strength: str, direction: str) -> str:
    """Generate a human-readable relationship description."""
    meta_a = get_variable_meta(var_a)
    meta_b = get_variable_meta(var_b)
    name_a = meta_a["display"]
    name_b = meta_b["display"]

    if strength == "negligible":
        return f"{name_a} and {name_b} show no statistically meaningful linear association during the selected period."

    dir_text = "positive" if direction == "positive" else "inverse"
    return (
        f"{name_a} and {name_b} exhibit a {strength} {dir_text} "
        f"statistical association (r = {r:+.3f}) during the selected period."
    )


def compute_correlation(
    dataset_id: str,
    var_a: str,
    var_b: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute pairwise correlation between two variables.

    Returns Pearson r, Spearman rho, covariance, and interpretation.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    _, values_a = _extract_time_series(ds, var_a, start_idx, end_idx, lat, lon, depth)
    _, values_b = _extract_time_series(ds, var_b, start_idx, end_idx, lat, lon, depth)
    ds.close()

    if len(values_a) < 3 or len(values_b) < 3:
        return None

    # Ensure same length
    n = min(len(values_a), len(values_b))
    values_a = values_a[:n]
    values_b = values_b[:n]

    # Pearson correlation
    if np.std(values_a) < 1e-10 or np.std(values_b) < 1e-10:
        pearson_r = 0.0
    else:
        pearson_r = float(np.corrcoef(values_a, values_b)[0, 1])

    # Spearman rank correlation
    try:
        from scipy.stats import spearmanr
        spearman_r, spearman_p = spearmanr(values_a, values_b)
        spearman_r = float(spearman_r) if not np.isnan(spearman_r) else 0.0
        spearman_p = float(spearman_p) if not np.isnan(spearman_p) else 1.0
    except ImportError:
        # Fallback: manual rank correlation
        rank_a = np.argsort(np.argsort(values_a)).astype(float)
        rank_b = np.argsort(np.argsort(values_b)).astype(float)
        if np.std(rank_a) < 1e-10 or np.std(rank_b) < 1e-10:
            spearman_r = 0.0
        else:
            spearman_r = float(np.corrcoef(rank_a, rank_b)[0, 1])
        spearman_p = 1.0  # Cannot compute without scipy

    # Covariance
    covariance = float(np.cov(values_a, values_b)[0, 1])

    # Classification
    strength = _classify_strength(pearson_r)
    direction = _classify_direction(pearson_r)
    description = _generate_relationship_text(var_a, var_b, pearson_r, strength, direction)

    meta_a = get_variable_meta(var_a)
    meta_b = get_variable_meta(var_b)

    return {
        "variable_a": var_a,
        "variable_b": var_b,
        "display_a": meta_a["display"],
        "display_b": meta_b["display"],
        "unit_a": meta_a["unit"],
        "unit_b": meta_b["unit"],
        "pearson_r": round(pearson_r, 4),
        "spearman_r": round(spearman_r, 4),
        "spearman_p": round(spearman_p, 6),
        "covariance": round(covariance, 6),
        "strength": strength,
        "direction": direction,
        "description": description,
        "n_observations": n,
        "values_a": [round(float(v), 4) for v in values_a],
        "values_b": [round(float(v), 4) for v in values_b],
        "mean_a": round(float(np.mean(values_a)), 4),
        "mean_b": round(float(np.mean(values_b)), 4),
        "std_a": round(float(np.std(values_a)), 4),
        "std_b": round(float(np.std(values_b)), 4),
    }


def compute_correlation_matrix(
    dataset_id: str,
    variables: list[str],
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute an NxN correlation matrix for the given variables.

    Returns matrix values, labels, and per-cell classification.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    # Extract all time series
    series = {}
    for var in variables:
        _, vals = _extract_time_series(ds, var, start_idx, end_idx, lat, lon, depth)
        if len(vals) > 0:
            series[var] = vals

    ds.close()

    if len(series) < 2:
        return None

    # Use only variables with data
    var_names = list(series.keys())
    n = len(var_names)

    # Ensure all same length
    min_len = min(len(v) for v in series.values())
    for k in var_names:
        series[k] = series[k][:min_len]

    # Build correlation matrix
    matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i == j:
                matrix[i, j] = 1.0
            else:
                a, b = series[var_names[i]], series[var_names[j]]
                if np.std(a) < 1e-10 or np.std(b) < 1e-10:
                    matrix[i, j] = 0.0
                else:
                    matrix[i, j] = float(np.corrcoef(a, b)[0, 1])

    # Build cell metadata
    cells = []
    for i in range(n):
        for j in range(n):
            r = matrix[i, j]
            cells.append({
                "row": i,
                "col": j,
                "variable_a": var_names[i],
                "variable_b": var_names[j],
                "value": round(r, 4),
                "strength": _classify_strength(r) if i != j else "identity",
                "direction": _classify_direction(r) if i != j else "identity",
            })

    labels = [get_variable_meta(v) for v in var_names]

    return {
        "variables": var_names,
        "labels": labels,
        "matrix": [[round(matrix[i, j], 4) for j in range(n)] for i in range(n)],
        "cells": cells,
        "n_observations": min_len,
    }


def compute_lagged_correlation(
    dataset_id: str,
    var_a: str,
    var_b: str,
    max_lag: int = 5,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Compute lagged cross-correlations between two variables.

    For each lag k (0..max_lag), computes correlation between
    var_a[t] and var_b[t+k].
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    _, values_a = _extract_time_series(ds, var_a, start_idx, end_idx, lat, lon, depth)
    _, values_b = _extract_time_series(ds, var_b, start_idx, end_idx, lat, lon, depth)
    ds.close()

    n = min(len(values_a), len(values_b))
    if n < 4:
        return None

    values_a = values_a[:n]
    values_b = values_b[:n]

    lags = []
    for lag in range(max_lag + 1):
        if n - lag < 3:
            break
        a = values_a[:n - lag]
        b = values_b[lag:]
        if np.std(a) < 1e-10 or np.std(b) < 1e-10:
            r = 0.0
        else:
            r = float(np.corrcoef(a, b)[0, 1])
        lags.append({
            "lag": lag,
            "correlation": round(r, 4),
            "strength": _classify_strength(r),
            "n_pairs": len(a),
        })

    meta_a = get_variable_meta(var_a)
    meta_b = get_variable_meta(var_b)

    # Find peak lag
    peak = max(lags, key=lambda x: abs(x["correlation"])) if lags else None

    return {
        "variable_a": var_a,
        "variable_b": var_b,
        "display_a": meta_a["display"],
        "display_b": meta_b["display"],
        "lags": lags,
        "peak_lag": peak["lag"] if peak else 0,
        "peak_correlation": peak["correlation"] if peak else 0.0,
    }
