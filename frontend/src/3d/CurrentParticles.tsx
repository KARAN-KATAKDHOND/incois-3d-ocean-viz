// === Current Particles ===
// Animated particle system visualizing ocean current velocity fields.

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useOceanStore } from '../stores/oceanStore';
import { modelApi } from '../services/api';
import type { CurrentsData } from '../types/ocean';
// @ts-ignore - suppress strict R3F typing

// Deterministic pseudo-random number generator for React Compiler purity
let seed = 123456789;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

interface CurrentParticlesProps {
  verticalExaggeration: number;
}

export function CurrentParticles({ verticalExaggeration }: CurrentParticlesProps) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const [currentsData, setCurrentsData] = useState<CurrentsData | null>(null);
  const timeIndex = useOceanStore((s) => s.timeIndex);
  const depthIndex = useOceanStore((s) => s.depthIndex);
  const particleDensity = useOceanStore((s) => s.particleDensity);
  const particleSpeed = useOceanStore((s) => s.particleSpeed);

  useEffect(() => {
    modelApi.getCurrents({ time_index: timeIndex, depth_index: depthIndex })
      .then((data) => setCurrentsData(data as CurrentsData))
      .catch(console.error);
  }, [timeIndex, depthIndex]);

  const { positions, velocities, colors, count } = useMemo(() => {
    const n = Math.min(particleDensity, 4000); // More particles for trails
    const pos = new Float32Array(n * 6); // 2 vertices per line (tail, head)
    const vel = new Float32Array(n * 3);
    const col = new Float32Array(n * 6); // 2 colors per line

    // Reset seed to guarantee deterministic output on re-renders
    seed = 123456789;

    if (!currentsData) {
      for (let i = 0; i < n; i++) {
        const px = (random() - 0.5) * 10;
        const py = -random() * 0.5;
        const pz = (random() - 0.5) * 8;
        
        pos[i * 6] = px; pos[i * 6 + 1] = py; pos[i * 6 + 2] = pz;
        pos[i * 6 + 3] = px; pos[i * 6 + 4] = py; pos[i * 6 + 5] = pz;
        
        vel[i * 3] = 0; vel[i * 3 + 1] = 0; vel[i * 3 + 2] = 0;
        
        col[i * 6] = 0; col[i * 6 + 1] = 0; col[i * 6 + 2] = 0; // Tail (dark/transparent)
        col[i * 6 + 3] = 0; col[i * 6 + 4] = 0.8; col[i * 6 + 5] = 1; // Head
      }
    } else {
      const [nLat, nLon] = currentsData.shape;

      for (let i = 0; i < n; i++) {
        const px = (random() - 0.5) * 10;
        const pz = (random() - 0.5) * 8;
        const py = -(currentsData.depth / 1000) * 5 * (verticalExaggeration / 5);
        
        pos[i * 6] = px; pos[i * 6 + 1] = py; pos[i * 6 + 2] = pz;
        pos[i * 6 + 3] = px; pos[i * 6 + 4] = py; pos[i * 6 + 5] = pz;

        const gi = Math.floor(((pz + 4) / 8) * (nLat - 1));
        const gj = Math.floor(((px + 5) / 10) * (nLon - 1));
        const idx = Math.max(0, Math.min(gi * nLon + gj, nLat * nLon - 1));

        const u = currentsData.u[idx] || 0;
        const v = currentsData.v[idx] || 0;
        const speed = currentsData.speed[idx] || 0;

        vel[i * 3] = u * 0.5;
        vel[i * 3 + 1] = py; // Store base Y in velocity array for wave bobbing
        vel[i * 3 + 2] = v * 0.5;

        // Sea wave colormap (Deep blue -> Cyan -> White)
        const t = Math.min(speed / (currentsData.max_speed || 1), 1);
        
        let r, g, b;
        if (t < 0.5) {
          const norm = t * 2;
          r = 0;
          g = 0.1 + norm * 0.7; // 0.1 to 0.8
          b = 0.4 + norm * 0.6; // 0.4 to 1.0
        } else {
          const norm = (t - 0.5) * 2;
          r = norm;
          g = 0.8 + norm * 0.2; // 0.8 to 1.0
          b = 1.0;
        }
        
        // Tail color (darker, fades out to simulate dissipating wave)
        col[i * 6] = r * 0.1;
        col[i * 6 + 1] = g * 0.1;
        col[i * 6 + 2] = b * 0.1;
        
        // Head color (bright wave crest)
        col[i * 6 + 3] = r;
        col[i * 6 + 4] = g;
        col[i * 6 + 5] = b;
      }
    }

    return { positions: pos, velocities: vel, colors: col, count: n };
  }, [currentsData, particleDensity, verticalExaggeration]);

  useFrame((state, delta) => {
    if (!linesRef.current) return;
    const positions = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const vx = velocities[i * 3] * particleSpeed * 1.5;
      const vz = velocities[i * 3 + 2] * particleSpeed * 1.5;

      // Move head forward
      arr[i * 6 + 3] += vx * delta;
      arr[i * 6 + 5] += vz * delta;
      
      // Wave motion: vertical bobbing based on time and position
      const baseY = velocities[i * 3 + 1];
      const waveOffset = Math.sin(state.clock.elapsedTime * 3 + arr[i * 6 + 3] * 0.8 + arr[i * 6 + 5] * 0.8) * 0.12;
      arr[i * 6 + 4] = baseY + waveOffset; // Head Y
      arr[i * 6 + 1] = baseY + waveOffset; // Tail Y
      
      // Move tail towards head (creates the trail effect)
      // Trail length depends on velocity
      arr[i * 6] += (arr[i * 6 + 3] - vx * 0.5 - arr[i * 6]) * 0.1;
      arr[i * 6 + 2] += (arr[i * 6 + 5] - vz * 0.5 - arr[i * 6 + 2]) * 0.1;

      // Wrap particles that leave the domain
      if (arr[i * 6 + 3] > 5 || arr[i * 6 + 3] < -5 || arr[i * 6 + 5] > 4 || arr[i * 6 + 5] < -4) {
        arr[i * 6 + 3] = (Math.random() - 0.5) * 10; // It is fine to use Math.random inside useFrame because it's not a render function
        arr[i * 6 + 5] = (Math.random() - 0.5) * 8;
        arr[i * 6] = arr[i * 6 + 3];
        arr[i * 6 + 2] = arr[i * 6 + 5];
      }
    }

    positions.needsUpdate = true;
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count * 2}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count * 2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        linewidth={2}
      />
    </lineSegments>
  );
}
