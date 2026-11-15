import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type * as THREE from 'three';
import { Destination } from '../types';

interface TestSceneProps {
  destination?: Destination;
}

function PlanetaryRings({ isMars }: { isMars: boolean }) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group ref={ringRef} rotation={[1.1, 0.4, 0]}>
      {/* Orbital Telemetry Path Ring */}
      <mesh>
        <torusGeometry args={[2.7, 0.012, 16, 120]} />
        <meshBasicMaterial
          color={isMars ? '#f97316' : '#38bdf8'}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Secondary Outer Navigation Ring */}
      <mesh rotation={[0.2, 0.3, 0]}>
        <torusGeometry args={[3.2, 0.006, 16, 120]} />
        <meshBasicMaterial
          color={isMars ? '#ea580c' : '#0284c7'}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

function CelestialBody({ destination = 'moon' }: { destination: Destination }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const isMars = destination === 'mars';

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.12;
      meshRef.current.rotation.x += delta * 0.01;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Primary Planetary Sphere with Surface Details */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.9, 64, 64]} />
        <meshStandardMaterial
          color={isMars ? '#c1440e' : '#94a3b8'}
          roughness={isMars ? 0.85 : 0.75}
          metalness={isMars ? 0.15 : 0.1}
          wireframe={false}
        />
      </mesh>

      {/* Atmospheric Limb Glow Ring for Mars / Exosphere Rim for Moon */}
      <mesh ref={atmosphereRef} scale={1.035}>
        <sphereGeometry args={[1.9, 48, 48]} />
        <meshBasicMaterial
          color={isMars ? '#fb923c' : '#38bdf8'}
          transparent
          opacity={isMars ? 0.22 : 0.12}
        />
      </mesh>

      {/* Outer Ionosphere Glow */}
      <mesh scale={1.08}>
        <sphereGeometry args={[1.9, 32, 32]} />
        <meshBasicMaterial
          color={isMars ? '#c2410c' : '#0284c7'}
          transparent
          opacity={isMars ? 0.08 : 0.05}
        />
      </mesh>

      {/* Orbital Telemetry Rings */}
      <PlanetaryRings isMars={isMars} />
    </group>
  );
}

export function TestScene({ destination = 'moon' }: TestSceneProps) {
  const isMars = destination === 'mars';

  return (
    <>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.4} />
      
      {/* Solar Key Light (Simulating unfiltered extraterrestrial sunlight) */}
      <directionalLight
        position={[8, 5, 6]}
        intensity={2.8}
        color={isMars ? '#fff7ed' : '#ffffff'}
      />
      
      {/* Backside Limb Fill Light */}
      <pointLight
        position={[-7, -4, -6]}
        intensity={0.8}
        color={isMars ? '#ea580c' : '#0284c7'}
      />

      {/* Deep Space Background Starfield */}
      <Stars
        radius={140}
        depth={70}
        count={4500}
        factor={5}
        saturation={0}
        fade
        speed={0.6}
      />

      <CelestialBody destination={destination} />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3.0}
        maxDistance={9.0}
        autoRotate={false}
      />
    </>
  );
}
