"""
Ocean Intelligence — Scientific Inference Engine

Rule-based, deterministic inference generation from computed statistics.
Generates structured scientific insights with confidence scoring,
oceanographic interpretations, and recommended investigations.

IMPORTANT: This engine never presents hypotheses as confirmed facts.
All interpretations use hedged scientific language.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from .statistics import _open_zarr, get_variable_meta, compute_summary, compute_kpi_cards
from .correlation import compute_correlation, compute_correlation_matrix
from .anomaly import detect_anomalies
from .trend_analysis import compute_trends

logger = logging.getLogger(__name__)

# Oceanographic interpretation templates — rule-based
RELATIONSHIP_TEMPLATES = {
    ("temperature", "salinity", "negative"): {
        "interpretations": [
            "The simultaneous increase in temperature and decrease in salinity may indicate freshwater influence from precipitation, river runoff, or ice melt.",
            "Surface heating combined with freshwater input may be driving stratification changes.",
            "This pattern may be consistent with water-mass mixing between warm-fresh and cold-saline water types.",
        ],
        "investigations": [
            "Rainfall and river discharge data for the region",
            "Surface heat flux observations",
            "Mixed layer depth evolution",
            "Water mass T-S characteristics",
        ],
    },
    ("temperature", "salinity", "positive"): {
        "interpretations": [
            "Temperature and salinity increasing together may indicate advection of warm, saline water into the region.",
            "This pattern may be consistent with subtropical water intrusion or upwelling of deeper water masses.",
        ],
        "investigations": [
            "Current direction and source water characteristics",
            "Subsurface water mass properties",
            "Regional circulation patterns",
        ],
    },
    ("temperature", "current_speed", "positive"): {
        "interpretations": [
            "The co-occurrence of warming and strengthening currents may indicate warm advection or eddy-driven heat transport.",
            "This pattern may be consistent with intensification of boundary currents or seasonal wind-driven circulation changes.",
        ],
        "investigations": [
            "Wind stress data and Ekman transport estimates",
            "Eddy kinetic energy maps",
            "Current direction relative to temperature gradients",
        ],
    },
    ("salinity", "current_speed", "negative"): {
        "interpretations": [
            "Decreasing salinity with increasing current speeds may suggest freshwater transport or precipitation-driven surface freshening during active circulation.",
        ],
        "investigations": [
            "Freshwater flux estimates",
            "Precipitation and evaporation data",
            "Current direction relative to salinity gradients",
        ],
    },
}

# Default template for unknown variable pairs
DEFAULT_TEMPLATE = {
    "interpretations": [
        "The observed statistical association between these parameters warrants further investigation to determine physical mechanisms.",
    ],
    "investigations": [
        "Historical climatology comparison",
        "Additional physical forcing data",
        "Spatial pattern analysis",
    ],
}


def _get_template(var_a: str, var_b: str, direction: str) -> dict:
    """Look up the appropriate interpretation template."""
    # Try both orderings
    key1 = (var_a, var_b, direction)
    key2 = (var_b, var_a, direction)
    return RELATIONSHIP_TEMPLATES.get(key1,
           RELATIONSHIP_TEMPLATES.get(key2, DEFAULT_TEMPLATE))


def _compute_overall_confidence(
    n_obs: int,
    pearson_r: float,
    trend_consistent: bool,
    n_anomalies: int,
) -> dict:
    """Compute overall inference confidence."""
    score = 0
    reasons = []

    # Observation count
    if n_obs >= 20:
        score += 3
        reasons.append(f"Sufficient observations (N={n_obs})")
    elif n_obs >= 7:
        score += 2
        reasons.append(f"Moderate observation count (N={n_obs})")
    else:
        score += 1
        reasons.append(f"Limited observations (N={n_obs})")

    # Correlation strength
    ar = abs(pearson_r)
    if ar >= 0.7:
        score += 3
        reasons.append(f"Strong statistical signal (|r|={ar:.3f})")
    elif ar >= 0.4:
        score += 2
        reasons.append(f"Moderate statistical signal (|r|={ar:.3f})")
    else:
        score += 1
        reasons.append(f"Weak statistical signal (|r|={ar:.3f})")

    # Trend consistency
    if trend_consistent:
        score += 2
        reasons.append("Trend direction consistent across period")
    else:
        score += 1
        reasons.append("Trend direction inconsistent or unstable")

    avg = score / 3
    if avg >= 2.5:
        level = "high"
    elif avg >= 1.5:
        level = "medium"
    else:
        level = "low"

    return {"level": level, "score": round(avg, 1), "reasons": reasons}


def generate_inference(
    dataset_id: str,
    start_idx: int = 0,
    end_idx: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    depth: Optional[float] = None,
) -> Optional[dict]:
    """
    Generate comprehensive scientific inferences for the selected
    dataset, time range, and location.

    This is the main entry point for the inference engine.
    """
    ds = _open_zarr(dataset_id)
    if ds is None:
        return None

    available_vars = list(ds.data_vars)
    # Add derived current_speed if applicable
    if ("u" in available_vars and "v" in available_vars) or \
       ("uo" in available_vars and "vo" in available_vars):
        available_vars.append("current_speed")

    ds.close()

    # 1. Compute trends for all variables
    trends_result = compute_trends(
        dataset_id, available_vars, start_idx, end_idx, lat, lon, depth
    )

    # 2. Compute correlation matrix for key variables
    analysis_vars = [v for v in available_vars if v not in ["u", "v", "uo", "vo", "usi", "vsi"]]
    if len(analysis_vars) < 2:
        analysis_vars = available_vars[:4]

    corr_matrix = compute_correlation_matrix(
        dataset_id, analysis_vars, start_idx, end_idx, lat, lon, depth
    )

    # 3. Detect anomalies for each variable
    anomalies = {}
    for var in analysis_vars:
        anom = detect_anomalies(dataset_id, var, start_idx, end_idx, lat, lon, depth)
        if anom:
            anomalies[var] = anom

    # 4. Find the strongest relationships
    discovered_relationships = []
    if corr_matrix:
        n = len(corr_matrix["variables"])
        for i in range(n):
            for j in range(i + 1, n):
                va = corr_matrix["variables"][i]
                vb = corr_matrix["variables"][j]
                r = corr_matrix["matrix"][i][j]
                strength = "strong" if abs(r) >= 0.7 else ("moderate" if abs(r) >= 0.4 else "weak")
                direction = "positive" if r > 0.1 else ("negative" if r < -0.1 else "negligible")

                if abs(r) >= 0.3:  # Only report meaningful relationships
                    meta_a = get_variable_meta(va)
                    meta_b = get_variable_meta(vb)
                    template = _get_template(va, vb, direction)

                    discovered_relationships.append({
                        "variable_a": va,
                        "variable_b": vb,
                        "display_a": meta_a["display"],
                        "display_b": meta_b["display"],
                        "pearson_r": round(r, 4),
                        "strength": strength,
                        "direction": direction,
                        "interpretation": template["interpretations"][0],
                        "investigations": template["investigations"],
                    })

        # Sort by absolute correlation (strongest first)
        discovered_relationships.sort(key=lambda x: abs(x["pearson_r"]), reverse=True)

    # 5. Generate the "What Changed?" timeline
    change_events = []
    if trends_result:
        for trend in trends_result["trends"]:
            if abs(trend["delta"]) > 1e-6:
                meta = get_variable_meta(trend["variable"])
                direction = "increased" if trend["delta"] > 0 else "decreased"
                change_events.append({
                    "variable": trend["variable"],
                    "display_name": meta["display"],
                    "unit": meta["unit"],
                    "delta": trend["delta"],
                    "pct_change": trend["pct_change"],
                    "direction": direction,
                    "description": f"{meta['display']} {direction} by {abs(trend['delta']):.4f} {meta['unit']} ({abs(trend['pct_change']):.1f}%)",
                })

    # 6. Generate connections between changes
    connections = []
    if len(change_events) >= 2 and discovered_relationships:
        for rel in discovered_relationships:
            if abs(rel["pearson_r"]) >= 0.4:
                connections.append({
                    "variables": [rel["display_a"], rel["display_b"]],
                    "correlation": rel["pearson_r"],
                    "strength": rel["strength"],
                    "description": (
                        f"{rel['display_a']} and {rel['display_b']} changes show a "
                        f"{rel['strength']} statistical association (r={rel['pearson_r']:+.3f})."
                    ),
                })

    # 7. Build the main insight card
    primary_insight = None
    if discovered_relationships:
        top = discovered_relationships[0]
        template = _get_template(top["variable_a"], top["variable_b"], top["direction"])

        # Find trend info for both variables
        trend_a = next((t for t in (trends_result["trends"] if trends_result else [])
                        if t["variable"] == top["variable_a"]), None)
        trend_b = next((t for t in (trends_result["trends"] if trends_result else [])
                        if t["variable"] == top["variable_b"]), None)

        trend_consistent = (
            trend_a is not None and trend_b is not None and
            trend_a["direction"] != "stable" and trend_b["direction"] != "stable"
        )

        n_anomalous = sum(
            1 for a in anomalies.values()
            if a["overall_status"] in ("moderate", "significant")
        )

        n_obs = corr_matrix["n_observations"] if corr_matrix else 0
        confidence = _compute_overall_confidence(
            n_obs, top["pearson_r"], trend_consistent, n_anomalous
        )

        # Build observation text
        obs_parts = []
        if trend_a:
            dir_text = "increased" if trend_a["delta"] > 0 else "decreased"
            obs_parts.append(
                f"{top['display_a']} {dir_text} by {abs(trend_a['delta']):.4f} {get_variable_meta(top['variable_a'])['unit']}"
            )
        if trend_b:
            dir_text = "increased" if trend_b["delta"] > 0 else "decreased"
            obs_parts.append(
                f"{top['display_b']} {dir_text} by {abs(trend_b['delta']):.4f} {get_variable_meta(top['variable_b'])['unit']}"
            )

        primary_insight = {
            "title": f"{top['strength'].title()} {top['display_a']}–{top['display_b']} Relationship",
            "observation": ". ".join(obs_parts) + "." if obs_parts else "Changes detected in multiple parameters.",
            "statistical_evidence": (
                f"Pearson correlation r = {top['pearson_r']:+.3f} indicates a {top['strength']} "
                f"{top['direction']} association over {n_obs} observations."
            ),
            "relationship": {
                "variables": [top["display_a"], top["display_b"]],
                "pearson_r": top["pearson_r"],
                "strength": top["strength"],
                "direction": top["direction"],
            },
            "interpretation": template["interpretations"][0],
            "confidence": confidence,
            "recommended_investigation": template["investigations"],
            "evidence_summary": [
                f"{top['strength'].title()} correlation: r = {top['pearson_r']:+.3f}",
                f"Based on {n_obs} temporal observations",
                f"{'Consistent' if trend_consistent else 'Variable'} trend direction",
            ],
        }

    # 8. Anomaly summary
    anomaly_summary = []
    for var, anom in anomalies.items():
        if anom["overall_status"] != "normal":
            meta = get_variable_meta(var)
            anomaly_summary.append({
                "variable": var,
                "display_name": meta["display"],
                "status": anom["overall_status"],
                "most_anomalous_day": anom["most_anomalous"]["time"],
                "peak_z_score": anom["most_anomalous"]["z_score"],
            })

    return {
        "primary_insight": primary_insight,
        "discovered_relationships": discovered_relationships,
        "change_events": change_events,
        "connections": connections,
        "anomaly_summary": anomaly_summary,
        "dataset_id": dataset_id,
        "is_demo": False,
    }
