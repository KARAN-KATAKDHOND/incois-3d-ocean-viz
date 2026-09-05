// === Depth Bounding Box ===
// Wireframe box representing the ocean volume domain.

import { useMemo } from 'react';
import * as THREE from 'three';

interface DepthBoxProps {
  verticalExaggeration: number;
}

export function DepthBox({ verticalExaggeration }: DepthBoxProps) {
  const depthScale = 5 * (verticalExaggeration / 5);

  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(10, depthScale, 8);
    return new THREE.EdgesGeometry(box);
  }, [depthScale]);

  return (
    <group position={[0, -depthScale / 2, 0]}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#1a3f6b" transparent opacity={0.4} />
      </lineSegments>

      {/* Bottom face with subtle gradient */}
      <mesh position={[0, -depthScale / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial
          color="#050d1a"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Side panels (very subtle) */}
      <mesh position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, depthScale]} />
        <meshBasicMaterial
          color="#0a1628"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[10, depthScale]} />
        <meshBasicMaterial
          color="#0a1628"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
