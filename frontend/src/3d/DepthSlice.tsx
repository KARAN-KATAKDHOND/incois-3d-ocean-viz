// === Depth Slice Renderer ===
// Interactive horizontal plane showing 2D data at a selected depth.
// Optimized with ShaderMaterial for physical data displacement.

import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useOceanStore } from '../stores/oceanStore';
import { modelApi } from '../services/api';
import { generateTexturePixels } from '../utils/colormaps';
import type { SliceData } from '../types/ocean';

interface DepthSliceProps {
  verticalExaggeration: number;
}

const VERTEX_SHADER = `
uniform sampler2D uTexture;
uniform float uMin;
uniform float uMax;
uniform int uVarType;
uniform float uExaggeration;
uniform float uTime;

varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vUv = uv;
  
  // Sample texture to get color and packed normalized data
  vec4 texel = texture2D(uTexture, vUv);
  vColor = texel.rgb;
  
  float normalizedVal = texel.a;
  float rawVal = normalizedVal * (uMax - uMin) + uMin;
  
  vec3 pos = position;
  vAlpha = 0.85; // Default transparency
  
  if (uVarType == 1) {
    // zos: Sea Surface Height (-1.5m to 1.5m typically)
    // Scale physically, then apply exaggeration
    pos.z += (rawVal / 1000.0) * 5.0 * (uExaggeration / 5.0) * 50.0; // Extra scalar for visibility
    // Add small waves
    pos.z += sin(pos.x * 10.0 + uTime * 2.0) * 0.02;
  } else if (uVarType == 2) {
    // mlotst: Mixed Layer Depth (0 to 200m)
    // Displace downwards
    pos.z -= (rawVal / 1000.0) * 5.0 * (uExaggeration / 5.0);
  } else if (uVarType == 3) {
    // siconc: Ice Fraction (0 to 1)
    vColor = vec3(0.9, 0.95, 1.0); // White/blue ice color
    vAlpha = rawVal; // 0 = no ice, 1 = solid ice
  } else if (uVarType == 4) {
    // sithick: Ice Thickness
    vColor = vec3(0.9, 0.95, 1.0);
    // Displace slightly upwards
    pos.z += (rawVal / 10.0) * 0.1;
    vAlpha = smoothstep(0.0, 0.5, rawVal) * 0.95; // Mostly opaque if any thickness
  }
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
  if (vAlpha < 0.05) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}
`;

export function DepthSlice({ verticalExaggeration }: DepthSliceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const textureRef = useRef<THREE.DataTexture | null>(null);
  
  const [sliceData, setSliceData] = useState<SliceData | null>(null);
  const variable = useOceanStore((s) => s.variable);
  const depthIndex = useOceanStore((s) => s.depthIndex);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const colorbar = useOceanStore((s) => s.colorbar);
  const datasetMeta = useOceanStore((s) => s.datasetMeta);

  // Fetch slice data when params change
  useEffect(() => {
    if (['currents', 'uo', 'vo', 'usi', 'vsi'].includes(variable)) return;

    let cancelled = false;
    modelApi.getSlice({
      dataset_id: datasetMeta?.id,
      variable,
      depth_index: depthIndex,
      time_index: timeIndex,
    }).then((data) => {
      if (!cancelled) {
        setSliceData(data as SliceData);
      }
    }).catch(console.error);

    return () => { cancelled = true; };
  }, [variable, depthIndex, timeIndex, datasetMeta?.id]);

  // Update texture efficiently (no memory leaks)
  useEffect(() => {
    if (!sliceData || !sliceData.data) return;

    const [nLat, nLon] = sliceData.shape.length >= 3
      ? [sliceData.shape[0], sliceData.shape[1]]
      : sliceData.shape;

    const width = nLon || 60;
    const height = nLat || 40;

    const pixels = generateTexturePixels(
      sliceData.data,
      colorbar.min,
      colorbar.max,
      colorbar.colormap,
      colorbar.scale,
      colorbar.reversed
    );

    if (!textureRef.current || textureRef.current.image.width !== width || textureRef.current.image.height !== height) {
      if (textureRef.current) textureRef.current.dispose();
      const tex = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      textureRef.current = tex;
    } else {
      textureRef.current.image.data.set(pixels);
    }
    textureRef.current.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = textureRef.current;
      materialRef.current.uniforms.uMin.value = colorbar.min;
      materialRef.current.uniforms.uMax.value = colorbar.max;
    }
  }, [sliceData, colorbar]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uExaggeration.value = verticalExaggeration;
    }
  });

  // Determine var type for shader
  let varType = 0;
  if (variable === 'zos') varType = 1;
  else if (variable === 'mlotst') varType = 2;
  else if (variable === 'siconc') varType = 3;
  else if (variable === 'sithick') varType = 4;

  const uniforms = useMemo(() => ({
    uTexture: { value: null },
    uMin: { value: colorbar.min },
    uMax: { value: colorbar.max },
    uVarType: { value: varType },
    uExaggeration: { value: verticalExaggeration },
    uTime: { value: 0 }
  }), [colorbar.min, colorbar.max, varType, verticalExaggeration]);

  // Update shader variable type when it changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uVarType.value = varType;
    }
  }, [varType]);

  // Compute Y position
  const depthLevels = datasetMeta?.depth_levels || [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
  const currentDepth = depthLevels[depthIndex] || 0;
  const maxDepth = depthLevels[depthLevels.length - 1] || 1000;
  
  let yPos = -(currentDepth / maxDepth) * 5 * (verticalExaggeration / 5);
  if (['zos', 'mlotst', 'sithick', 'siconc'].includes(variable)) {
    yPos = 0.05; // Lock slightly above ocean surface
  } else if (variable === 'bottomT') {
    yPos = -5 * (verticalExaggeration / 5); // Lock to bottom
  }

  // We need high segments for vertex displacement
  const segments = varType > 0 ? 120 : 1;

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 8, segments, segments]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
