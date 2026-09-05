// === Landing Page ===
// Impressive hero with 3D ocean scene and CTA.

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Float } from '@react-three/drei';
import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Deterministic pseudo-random number generator for React Compiler purity
let seed = 987654321;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function HeroGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Create particles
  const particleCount = 800;
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    
    seed = 987654321; // Reset seed
    
    for (let i = 0; i < particleCount; i++) {
      const theta = random() * Math.PI * 2;
      const phi = random() * Math.PI;
      const r = 2.2 + random() * 0.3;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      col[i * 3] = 0;
      col[i * 3 + 1] = 0.7 + random() * 0.3;
      col[i * 3 + 2] = 1;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Globe sphere */}
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhysicalMaterial
          color="#0a3d5c"
          roughness={0.3}
          metalness={0.1}
          transparent
          opacity={0.8}
          emissive="#001a33"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Atmospheric glow */}
      <mesh>
        <sphereGeometry args={[2.15, 32, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshBasicMaterial
          color="#0091ea"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Current particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={particleCount} itemSize={3} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} count={particleCount} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

interface LandingPageProps {
  onLaunch: () => void;
}

export function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="w-full h-full relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #020617 100%)' }}>

      {/* 3D Background */}
      <div className="absolute inset-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} />
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} color="#e0f4fa" />
          <pointLight position={[-3, -3, 3]} intensity={0.3} color="#00e5ff" />
          <Stars radius={50} depth={30} count={2000} factor={2} saturation={0.3} fade speed={0.3} />
          <Suspense fallback={null}>
            <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.3}>
              <HeroGlobe />
            </Float>
          </Suspense>
          <fog attach="fog" args={['#020617', 8, 20]} />
        </Canvas>
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{ pointerEvents: 'none' }}>
        <div className="text-center max-w-2xl px-8" style={{ pointerEvents: 'auto' }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
            }}>
            <span className="demo-badge">SIH 2026</span>
            <span className="text-xs" style={{ color: '#00e5ff' }}>Problem Statement SIH26067</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight"
            style={{
              background: 'linear-gradient(135deg, #e0f4fa, #00e5ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            Explore the Ocean<br />in Four Dimensions
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg mb-8 leading-relaxed" style={{ color: '#7ec8e3' }}>
            Interactive 3D visualization of numerical ocean model outputs
            and real-world in-situ observations. Built for operational
            oceanographers and researchers.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onLaunch}
              className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00838f, #00e5ff)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0, 229, 255, 0.3)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
              }}
            >
              🌊 Launch Ocean Explorer
            </button>
            <button
              onClick={onLaunch}
              className="px-6 py-3 rounded-xl text-sm transition-all hover:scale-105"
              style={{
                background: 'rgba(15, 32, 56, 0.6)',
                color: '#7ec8e3',
                border: '1px solid rgba(42, 108, 176, 0.3)',
                backdropFilter: 'blur(8px)',
              }}
            >
              Explore Demo Data
            </button>
          </div>

          {/* Features */}
          <div className="flex items-center justify-center gap-6 mt-10">
            {[
              { icon: '🌡️', label: 'Temperature' },
              { icon: '🧂', label: 'Salinity' },
              { icon: '🌀', label: 'Currents' },
              { icon: '📍', label: 'Observations' },
              { icon: '📊', label: 'Profiles' },
            ].map((f) => (
              <div key={f.label} className="text-center">
                <div className="text-lg mb-1">{f.icon}</div>
                <div className="text-[10px]" style={{ color: '#4b9cd3' }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-24"
        style={{ background: 'linear-gradient(transparent, #020617)' }} />
    </div>
  );
}
