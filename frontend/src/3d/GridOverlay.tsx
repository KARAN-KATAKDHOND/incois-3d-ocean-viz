// === Grid Overlay ===
// Lat/lon grid lines and depth axis labels.

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { latLonToScene } from '../utils/coordinates';
import { useOceanStore } from '../stores/oceanStore';

interface GridOverlayProps {
  verticalExaggeration: number;
}

// imported latLonToScene

function GridLine({ points }: { points: THREE.Vector3[] }) {
  const ref = useRef<THREE.Line>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
  }, [points]);
  return (
    // @ts-ignore - R3F primitive typing
    <primitive object={new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#1a3f6b', transparent: true, opacity: 0.3 })
    )} />
  );
}

export function GridOverlay({ verticalExaggeration: _ve }: GridOverlayProps) {
  const datasetMeta = useOceanStore((s) => s.datasetMeta);
  const extent = datasetMeta?.spatial_extent || { lat_min: 5, lat_max: 25, lon_min: 60, lon_max: 100 };

  const gridLineData = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    
    // Dynamic step based on range
    const latRange = extent.lat_max - extent.lat_min;
    const lonRange = extent.lon_max - extent.lon_min;
    
    // Attempt to roughly draw 5 to 10 lines
    const latStep = Math.max(Math.round(latRange / 5), 1);
    const lonStep = Math.max(Math.round(lonRange / 8), 1);

    // Latitude lines
    for (let lat = Math.floor(extent.lat_min); lat <= Math.ceil(extent.lat_max); lat += latStep) {
      const [, , z] = latLonToScene(lat, extent.lon_min, extent, 10, 8);
      lines.push([
        new THREE.Vector3(-5, 0.005, z),
        new THREE.Vector3(5, 0.005, z),
      ]);
    }

    // Longitude lines
    for (let lon = Math.floor(extent.lon_min); lon <= Math.ceil(extent.lon_max); lon += lonStep) {
      const [x, , ] = latLonToScene(extent.lat_min, lon, extent, 10, 8);
      lines.push([
        new THREE.Vector3(x, 0.005, -4),
        new THREE.Vector3(x, 0.005, 4),
      ]);
    }

    return lines;
  }, [extent]);

  return (
    <group>
      {/* Grid lines */}
      {gridLineData.map((points, i) => (
        <GridLine key={`grid-${i}`} points={points} />
      ))}
    </group>
  );
}
