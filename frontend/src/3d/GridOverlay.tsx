// === Grid Overlay ===
// Lat/lon grid lines and depth axis labels.

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

interface GridOverlayProps {
  verticalExaggeration: number;
}

function latLonToScene(lat: number, lon: number): [number, number] {
  const x = ((lon - 60) / 40) * 10 - 5;
  const z = ((lat - 5) / 20) * 8 - 4;
  return [x, z];
}

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
  const gridLineData = useMemo(() => {
    const lines: THREE.Vector3[][] = [];

    // Latitude lines (every 5 degrees)
    for (let lat = 5; lat <= 25; lat += 5) {
      const [, z] = latLonToScene(lat, 60);
      lines.push([
        new THREE.Vector3(-5, 0.005, z),
        new THREE.Vector3(5, 0.005, z),
      ]);
    }

    // Longitude lines (every 10 degrees)
    for (let lon = 60; lon <= 100; lon += 10) {
      const [x] = latLonToScene(5, lon);
      lines.push([
        new THREE.Vector3(x, 0.005, -4),
        new THREE.Vector3(x, 0.005, 4),
      ]);
    }

    return lines;
  }, []);

  return (
    <group>
      {/* Grid lines */}
      {gridLineData.map((points, i) => (
        <GridLine key={`grid-${i}`} points={points} />
      ))}
    </group>
  );
}
