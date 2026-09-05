// === Ocean Surface Mesh ===
// Animated water surface with subtle wave displacement.

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function OceanSurface() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10, 8, 64, 48);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a3d5c'),
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      ior: 1.33, // Water IOR
      side: THREE.DoubleSide,
      envMapIntensity: 0.5,
    });
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const positions = geo.attributes.position;
    const t = clock.getElapsedTime() * 0.3;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = Math.sin(x * 2 + t) * 0.02 + Math.cos(z * 3 + t * 0.7) * 0.015;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} position={[0, 0, 0]} />;
}
