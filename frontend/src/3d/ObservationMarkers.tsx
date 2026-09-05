// === Observation Markers ===
// 3D markers for Argo, Glider, CTD, BGC instruments.

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useOceanStore } from '../stores/oceanStore';
import { observationApi } from '../services/api';
import type { Observation } from '../types/ocean';

const INSTRUMENT_COLORS: Record<string, string> = {
  argo: '#00e5ff',
  glider: '#ffd600',
  ctd: '#ff6d00',
  bgc: '#00c853',
};

interface ObservationMarkersProps {
  verticalExaggeration: number;
}

function latLonToScene(lat: number, lon: number, depth: number, ve: number, maxDepth = 1000) {
  // Map lat 5-25 → z -4 to 4, lon 60-100 → x -5 to 5
  const x = ((lon - 60) / 40) * 10 - 5;
  const z = ((lat - 5) / 20) * 8 - 4;
  const y = -(depth / maxDepth) * 5 * (ve / 5);
  return [x, y, z] as const;
}

function MarkerMesh({
  obs,
  verticalExaggeration,
  onClick,
  isSelected,
}: {
  obs: Observation;
  verticalExaggeration: number;
  onClick: (obs: Observation) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [x, y, z] = latLonToScene(obs.latitude, obs.longitude, obs.depth, verticalExaggeration);
  const color = INSTRUMENT_COLORS[obs.instrument_type] || '#ffffff';
  const scale = isSelected ? 1.5 : hovered ? 1.2 : 1;

  return (
    <group position={[x, y, z]}>
      {/* Marker geometry varies by instrument type */}
      {obs.instrument_type === 'argo' && (
        <mesh
          scale={scale}
          onClick={(e) => { e.stopPropagation(); onClick(obs); }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
          />
        </mesh>
      )}
      {obs.instrument_type === 'glider' && (
        <mesh
          scale={scale}
          onClick={(e) => { e.stopPropagation(); onClick(obs); }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <coneGeometry args={[0.06, 0.16, 4]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
          />
        </mesh>
      )}
      {obs.instrument_type === 'ctd' && (
        <mesh
          scale={scale}
          onClick={(e) => { e.stopPropagation(); onClick(obs); }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <cylinderGeometry args={[0.04, 0.06, 0.16, 6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
          />
        </mesh>
      )}
      {obs.instrument_type === 'bgc' && (
        <mesh
          scale={scale}
          onClick={(e) => { e.stopPropagation(); onClick(obs); }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          rotation={[0, Math.PI / 4, 0]}
        >
          <octahedronGeometry args={[0.07]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
          />
        </mesh>
      )}

      {/* Vertical line to surface */}
      {obs.depth > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, 0, -y, 0]), 3]}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.3} />
        </line>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10, 22, 40, 0.9)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '8px',
            padding: '6px 10px',
            color: '#e0f4fa',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            transform: 'translateY(-30px)',
          }}>
            <div style={{ fontWeight: 600, color: color }}>{obs.id}</div>
            <div>{obs.latitude.toFixed(2)}°N, {obs.longitude.toFixed(2)}°E</div>
            <div>Depth: {obs.depth}m</div>
          </div>
        </Html>
      )}

      {/* Glow ring for selected */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.09, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export function ObservationMarkers({ verticalExaggeration }: ObservationMarkersProps) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const obsLayers = useOceanStore((s) => s.obsLayers);
  const selectedObservation = useOceanStore((s) => s.selectedObservation);
  const setSelectedObservation = useOceanStore((s) => s.setSelectedObservation);

  useEffect(() => {
    observationApi.list().then(setObservations).catch(console.error);
  }, []);

  const visibleObs = useMemo(() => {
    return observations.filter((o) => {
      const layer = obsLayers[o.instrument_type];
      return layer && layer.visible;
    });
  }, [observations, obsLayers]);

  const handleClick = useCallback((obs: Observation) => {
    setSelectedObservation(obs);
  }, [setSelectedObservation]);

  return (
    <group>
      {visibleObs.map((obs) => (
        <MarkerMesh
          key={obs.id}
          obs={obs}
          verticalExaggeration={verticalExaggeration}
          onClick={handleClick}
          isSelected={selectedObservation?.id === obs.id}
        />
      ))}
    </group>
  );
}
