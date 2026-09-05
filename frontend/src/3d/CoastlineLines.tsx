// === Coastline Lines ===
// Simplified coastline geometry for the North Indian Ocean.

import { useMemo } from 'react';
import * as THREE from 'three';

// Simplified coastline points (lat, lon) for North Indian Ocean
const COASTLINE_SEGMENTS: [number, number][][] = [
  // Western India coast
  [
    [23.5, 68.5], [23.0, 68.3], [22.5, 69.0], [21.5, 69.8],
    [20.5, 72.5], [19.0, 72.8], [18.5, 73.0], [17.5, 73.2],
    [16.0, 73.3], [15.0, 73.8], [14.0, 74.5], [12.5, 74.8],
    [11.5, 75.5], [10.0, 76.0], [9.0, 76.5], [8.0, 77.0],
    [8.0, 77.5],
  ],
  // Eastern India / Bay of Bengal coast
  [
    [8.0, 77.5], [8.5, 78.0], [9.5, 79.0], [10.0, 79.8],
    [10.5, 80.0], [11.5, 80.0], [13.0, 80.2], [14.5, 80.0],
    [16.0, 81.0], [17.5, 83.0], [19.0, 85.0], [20.5, 87.0],
    [21.5, 87.5], [22.0, 88.5], [22.5, 88.8],
  ],
  // Sri Lanka
  [
    [9.5, 80.0], [8.5, 81.0], [7.5, 81.5], [6.5, 81.0],
    [6.0, 80.5], [6.5, 80.0], [7.0, 79.8], [8.0, 80.0],
    [9.0, 79.5], [9.5, 80.0],
  ],
  // Myanmar coast
  [
    [22.5, 88.8], [21.0, 92.0], [20.0, 93.0], [18.0, 94.5],
    [16.0, 94.5], [15.0, 95.0],
  ],
  // Arabian Peninsula (partial)
  [
    [25.0, 62.0], [24.0, 63.0], [23.5, 65.0], [23.5, 68.5],
  ],
  // Somalia/Horn of Africa (partial)
  [
    [12.0, 60.0], [10.0, 61.0], [8.0, 62.0], [5.0, 65.0],
  ],
];

function latLonToScene(lat: number, lon: number): [number, number, number] {
  const x = ((lon - 60) / 40) * 10 - 5;
  const z = ((lat - 5) / 20) * 8 - 4;
  return [x, 0.01, z]; // Slightly above surface
}

export function CoastlineLines() {
  const lines = useMemo(() => {
    return COASTLINE_SEGMENTS.map((segment) => {
      const points = segment.map(([lat, lon]) => {
        const [x, y, z] = latLonToScene(lat, lon);
        return new THREE.Vector3(x, y, z);
      });
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: '#4b9cd3', transparent: true, opacity: 0.6 });
      return new THREE.Line(geo, mat);
    });
  }, []);

  return (
    <group>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}
