// === Isosurface Mesh ===
// Renders server-computed isosurface mesh in the 3D scene.

import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useOceanStore } from '../stores/oceanStore';
import { modelApi } from '../services/api';
import type { IsosurfaceData } from '../types/ocean';

interface IsosurfaceMeshProps {
  verticalExaggeration: number;
}

export function IsosurfaceMesh({ verticalExaggeration }: IsosurfaceMeshProps) {
  const [isoData, setIsoData] = useState<IsosurfaceData | null>(null);
  const variable = useOceanStore((s) => s.variable);
  const isoThreshold = useOceanStore((s) => s.isoThreshold);
  const timeIndex = useOceanStore((s) => s.timeIndex);

  useEffect(() => {
    if (variable === 'currents') return;

    modelApi.getIsosurface({ variable, threshold: isoThreshold, time_index: timeIndex })
      .then(setIsoData)
      .catch(console.error);
  }, [variable, isoThreshold, timeIndex]);

  const geometry = useMemo(() => {
    if (!isoData || isoData.vertex_count === 0) return null;

    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array(isoData.vertices);
    const normals = new Float32Array(isoData.normals);
    const indices = new Uint32Array(isoData.indices);

    // Scale vertices to scene space
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] = vertices[i] * 10 - 5;          // lon → x
      vertices[i + 1] = -vertices[i + 2] * 5 * (verticalExaggeration / 5);  // depth → y
      vertices[i + 2] = vertices[i + 1 - 1] * 8 - 4;  // lat → z (use original i+1)
    }

    // Re-map properly
    const remapped = new Float32Array(vertices.length);
    for (let i = 0; i < isoData.vertex_count; i++) {
      const srcX = isoData.vertices[i * 3];     // lat normalized
      const srcY = isoData.vertices[i * 3 + 1]; // lon normalized
      const srcZ = isoData.vertices[i * 3 + 2]; // depth normalized
      remapped[i * 3] = srcY * 10 - 5;          // x from lon
      remapped[i * 3 + 1] = -srcZ * 5 * (verticalExaggeration / 5);  // y from depth
      remapped[i * 3 + 2] = srcX * 8 - 4;       // z from lat
    }

    geo.setAttribute('position', new THREE.BufferAttribute(remapped, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, [isoData, verticalExaggeration]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color="#00e5ff"
        transparent
        opacity={0.5}
        roughness={0.3}
        metalness={0.1}
        side={THREE.DoubleSide}
        emissive="#00838f"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}
