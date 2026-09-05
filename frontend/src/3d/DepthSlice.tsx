// === Depth Slice Renderer ===
// Interactive horizontal plane showing 2D data at a selected depth.

import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useOceanStore } from '../stores/oceanStore';
import { modelApi } from '../services/api';
import { generateColorArray } from '../utils/colormaps';
import type { SliceData } from '../types/ocean';

interface DepthSliceProps {
  verticalExaggeration: number;
}

export function DepthSlice({ verticalExaggeration }: DepthSliceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [sliceData, setSliceData] = useState<SliceData | null>(null);
  const variable = useOceanStore((s) => s.variable);
  const depthIndex = useOceanStore((s) => s.depthIndex);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const colorbar = useOceanStore((s) => s.colorbar);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);

  // Fetch slice data when params change
  useEffect(() => {
    if (variable === 'currents') return;

    let cancelled = false;
    modelApi.getSlice({
      variable,
      depth_index: depthIndex,
      time_index: timeIndex,
    }).then((data) => {
      if (!cancelled) setSliceData(data as SliceData);
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [variable, depthIndex, timeIndex]);

  // Build texture from data
  const texture = useMemo(() => {
    if (!sliceData || !sliceData.data) return null;

    const [nLat, nLon] = sliceData.shape.length >= 3
      ? [sliceData.shape[0], sliceData.shape[1]]
      : sliceData.shape;

    const width = nLon || 60;
    const height = nLat || 40;
    const pixels = new Uint8Array(width * height * 4);
    const colors = generateColorArray(
      sliceData.data,
      colorbar.min,
      colorbar.max,
      colorbar.colormap,
      colorbar.scale,
      colorbar.reversed,
    );

    const dataLen = sliceData.data.length;
    for (let i = 0; i < width * height && i < dataLen; i++) {
      pixels[i * 4] = Math.round(colors[i * 3] * 255);
      pixels[i * 4 + 1] = Math.round(colors[i * 3 + 1] * 255);
      pixels[i * 4 + 2] = Math.round(colors[i * 3 + 2] * 255);
      pixels[i * 4 + 3] = 200; // Semi-transparent
    }

    const tex = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [sliceData, colorbar]);

  // Compute Y position from depth
  const depthLevels = datasetMeta?.depth_levels || [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
  const currentDepth = depthLevels[depthIndex] || 0;
  const maxDepth = depthLevels[depthLevels.length - 1] || 1000;
  const yPos = -(currentDepth / maxDepth) * 5 * (verticalExaggeration / 5);

  if (!texture) return null;

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 8]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
