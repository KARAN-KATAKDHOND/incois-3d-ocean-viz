// === Main 3D Ocean Scene ===
// R3F Canvas containing the complete 3D ocean visualization.

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { DepthSlice } from './DepthSlice';
import { OceanSurface } from './OceanSurface';
import { ObservationMarkers } from './ObservationMarkers';
import { CurrentParticles } from './CurrentParticles';
import { IsosurfaceMesh } from './IsosurfaceMesh';
import { CoastlineLines } from './CoastlineLines';
import { GridOverlay } from './GridOverlay';
import { DepthBox } from './DepthBox';
import { useOceanStore } from '../stores/oceanStore';

function SceneContent() {
  const verticalExaggeration = useOceanStore((s) => s.verticalExaggeration);
  const vizMode = useOceanStore((s) => s.vizMode);
  const isoEnabled = useOceanStore((s) => s.isoEnabled);
  const variable = useOceanStore((s) => s.variable);
  const modelLayers = useOceanStore((s) => s.modelLayers);

  const isLayerVisible = modelLayers[variable]?.visible ?? true;

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} color="#e0f4fa" />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} color="#4b9cd3" />
      <pointLight position={[0, -5, 0]} intensity={0.2} color="#00e5ff" />

      {/* Ocean depth bounding box */}
      <DepthBox verticalExaggeration={verticalExaggeration} />

      {/* Grid lines for geographic context */}
      <GridOverlay verticalExaggeration={verticalExaggeration} />

      {/* Coastline */}
      <CoastlineLines />

      {/* Ocean surface */}
      <OceanSurface />

      {/* Depth slice */}
      {isLayerVisible && (vizMode === 'depth_slice' || vizMode === 'volume') && (
        <DepthSlice verticalExaggeration={verticalExaggeration} />
      )}

      {/* Isosurface */}
      {isLayerVisible && isoEnabled && vizMode === 'isosurface' && (
        <IsosurfaceMesh verticalExaggeration={verticalExaggeration} />
      )}

      {/* Current particles */}
      {isLayerVisible && vizMode === 'currents' && (
        <CurrentParticles verticalExaggeration={verticalExaggeration} />
      )}

      {/* Observation markers */}
      <ObservationMarkers verticalExaggeration={verticalExaggeration} />

      {/* Background atmosphere */}
      <Stars radius={100} depth={50} count={1000} factor={3} saturation={0.3} fade speed={0.5} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00e5ff" wireframe />
    </mesh>
  );
}

export function OceanScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'linear-gradient(180deg, #020617 0%, #0a1628 50%, #0f2038 100%)' }}
      >
        <PerspectiveCamera makeDefault position={[12, 8, 12]} fov={50} near={0.1} far={500} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={50}
          maxPolarAngle={Math.PI * 0.85}
          target={[0, -1, 0]}
        />
        <fog attach="fog" args={['#020617', 30, 80]} />
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
