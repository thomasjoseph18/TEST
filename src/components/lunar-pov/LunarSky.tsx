import { useEffect } from 'react';
import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface LunarSkyProps {
  lowPerformanceMode?: boolean;
}

export function LunarSky({ lowPerformanceMode = false }: LunarSkyProps) {
  const { scene } = useThree();

  // Apply exponential fog for horizon depth
  useEffect(() => {
    const fog = new THREE.FogExp2(0x000208, 0.0022);
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  const starCount = lowPerformanceMode ? 1200 : 2800;

  return (
    <>
      {/* Background sky colour */}
      <color attach="background" args={['#000005']} />

      {/* Sun — sharp, unfiltered solar key light (no atmosphere on Moon) */}
      <directionalLight
        position={[180, 90, -280]}
        intensity={3.5}
        color="#fffff8"
      />

      {/* Earth-shine hemisphere fill — simulates soft blue reflected light from Earth */}
      <hemisphereLight
        args={['#0d1828', '#181208', 0.5]}
      />

      {/* Earth sphere group */}
      <group position={[-60, 142, -420]}>
        {/* Ocean base */}
        <mesh>
          <sphereGeometry args={[20, 48, 32]} />
          <meshStandardMaterial
            color="#0f2a52"
            emissive="#1a3a70"
            emissiveIntensity={0.5}
            roughness={0.85}
            metalness={0}
          />
        </mesh>

        {/* Cloud / continent layer */}
        <mesh scale={1.015}>
          <sphereGeometry args={[20, 32, 24]} />
          <meshBasicMaterial
            color="#7ab8e0"
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Atmosphere rim glow */}
        <mesh scale={1.055}>
          <sphereGeometry args={[20, 32, 24]} />
          <meshBasicMaterial
            color="#4080c0"
            transparent
            opacity={0.14}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Outer thin halo */}
        <mesh scale={1.10}>
          <sphereGeometry args={[20, 24, 16]} />
          <meshBasicMaterial
            color="#2050a0"
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Deep-space starfield */}
      <Stars
        radius={440}
        depth={80}
        count={starCount}
        factor={5.5}
        saturation={0}
        fade
        speed={0.2}
      />
    </>
  );
}
