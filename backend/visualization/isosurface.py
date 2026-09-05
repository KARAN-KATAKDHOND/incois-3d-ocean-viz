"""
Isosurface extraction using a simplified marching-cubes approach.
Converts 3D scalar field data into a triangulated mesh surface
at a given threshold value.
"""
import numpy as np
from typing import Optional


def extract_isosurface(volume_data: dict, threshold: float, variable: str) -> dict:
    """
    Extract an isosurface from 3D volume data at the given threshold.
    Uses a simplified approach that creates a mesh from grid cells
    where the data crosses the threshold.
    """
    shape = volume_data["shape"]
    data = np.array(volume_data["data"]).reshape(shape)
    lat_range = volume_data["lat_range"]
    lon_range = volume_data["lon_range"]
    depth_range = volume_data["depth_range"]

    n_lat, n_lon, n_depth = shape
    vertices = []
    normals = []
    indices = []

    # Normalized coordinate ranges
    lats = np.linspace(0, 1, n_lat)
    lons = np.linspace(0, 1, n_lon)
    depths = np.linspace(0, 1, n_depth)

    vertex_count = 0

    # Walk through the grid looking for threshold crossings
    for i in range(n_lat - 1):
        for j in range(n_lon - 1):
            for k in range(n_depth - 1):
                # Get cube corner values
                cube = np.array([
                    data[i, j, k], data[i+1, j, k],
                    data[i+1, j+1, k], data[i, j+1, k],
                    data[i, j, k+1], data[i+1, j, k+1],
                    data[i+1, j+1, k+1], data[i, j+1, k+1]
                ])

                # Check if threshold crosses this cube
                above = cube >= threshold
                if above.all() or not above.any():
                    continue

                # Create simplified surface: generate quad at the cube center
                cx = (lats[i] + lats[i+1]) / 2
                cy = (lons[j] + lons[j+1]) / 2
                cz = (depths[k] + depths[k+1]) / 2

                dx = (lats[i+1] - lats[i]) / 2
                dy = (lons[j+1] - lons[j]) / 2
                dz = (depths[k+1] - depths[k]) / 2

                # Interpolate position based on where threshold crosses
                frac_above = above.sum() / 8.0

                # Determine dominant face orientation
                # Check which axis has the steepest gradient
                grad_x = abs(data[i+1, j, k] - data[i, j, k]) if i < n_lat - 1 else 0
                grad_y = abs(data[i, j+1, k] - data[i, j, k]) if j < n_lon - 1 else 0
                grad_z = abs(data[i, j, k+1] - data[i, j, k]) if k < n_depth - 1 else 0

                max_grad = max(grad_x, grad_y, grad_z)
                if max_grad == 0:
                    continue

                # Create two triangles forming a quad perpendicular to gradient
                if grad_z >= grad_x and grad_z >= grad_y:
                    # Z-facing quad
                    v = [
                        [cx - dx, cy - dy, cz],
                        [cx + dx, cy - dy, cz],
                        [cx + dx, cy + dy, cz],
                        [cx - dx, cy + dy, cz],
                    ]
                    n = [0, 0, 1]
                elif grad_x >= grad_y:
                    # X-facing quad
                    v = [
                        [cx, cy - dy, cz - dz],
                        [cx, cy + dy, cz - dz],
                        [cx, cy + dy, cz + dz],
                        [cx, cy - dy, cz + dz],
                    ]
                    n = [1, 0, 0]
                else:
                    # Y-facing quad
                    v = [
                        [cx - dx, cy, cz - dz],
                        [cx + dx, cy, cz - dz],
                        [cx + dx, cy, cz + dz],
                        [cx - dx, cy, cz + dz],
                    ]
                    n = [0, 1, 0]

                for vert in v:
                    vertices.extend(vert)
                    normals.extend(n)

                # Two triangles for the quad
                idx = vertex_count
                indices.extend([idx, idx + 1, idx + 2])
                indices.extend([idx, idx + 2, idx + 3])
                vertex_count += 4

    unit_map = {"temperature": "°C", "salinity": "PSU"}

    return {
        "variable": variable,
        "unit": unit_map.get(variable, ""),
        "threshold": threshold,
        "vertices": vertices,
        "normals": normals,
        "indices": indices,
        "vertex_count": vertex_count
    }
