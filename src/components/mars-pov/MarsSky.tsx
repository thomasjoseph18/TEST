import { useEffect } from 'react';
import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface MarsSkyProps {
  lowPerformanceMode?: boolean;
}

export function MarsSky({ lowPerformanceMode = false }: MarsSkyProps) {
  const { scene } = useThree();

  // Dusty terracotta fog — distinctive from lunar black void
  useEffect(() => {
    const fog = new THREE.FogExp2(0x6b2d10, 0.0028);
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Fewer stars — Martian dust haze reduces star visibility
  const starCount = lowPerformanceMode ? 400 : 900;

  return (
    <>
      {/* Martian sky background — dusty amber */}
      <color attach="background" args={['#2a0e04']} />

      {/* Sky dome — dual-layer terracotta sky */}
      <mesh>
        <sphereGeometry args={[470, 32, 16]} />
        <meshBasicMaterial color="#3d1808" side={THREE.BackSide} />
      </mesh>

      {/* Horizon glow band */}
      <mesh>
        <sphereGeometry args={[460, 32, 8, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.2]} />
        <meshBasicMaterial
          color="#8b3a0a"
          side={THREE.BackSide}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Sun — smaller and dimmer on Mars (1.52× farther from Sun) */}
      <directionalLight
        position={[300, 60, -400]}
        intensity={1.8}
        color="#ffe8c0"
      />

      {/* Martian hemisphere light — dim rusty fill */}
      <hemisphereLight
        args={['#2a0d05', '#180a03', 0.4]}
      />

      {/* Ambient fill — slight warm tint for dusty sky scatter */}
      <ambientLight color="#3d1a0a" intensity={0.3} />

      {/* Phobos — large, potato-shaped inner moon (close, fast orbit) */}
      <mesh position={[80, 90, -300]}>
        <sphereGeometry args={[2.4, 12, 8]} />
        <meshStandardMaterial
          color="#8a7a60"
          emissive="#6a5a40"
          emissiveIntensity={0.3}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Phobos point light for subtle presence */}
      <pointLight position={[80, 90, -300]} color="#ffe8c0" intensity={0.1} distance={50} />

      {/* Deimos — tiny, farther outer moon */}
      <mesh position={[-180, 110, -380]}>
        <sphereGeometry args={[0.9, 10, 7]} />
        <meshStandardMaterial
          color="#b0a080"
          emissive="#908060"
          emissiveIntensity={0.4}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Sparse stars through dusty atmosphere */}
      <Stars
        radius={420}
        depth={60}
        count={starCount}
        factor={3.5}
        saturation={0}
        fade
        speed={0.1}
      />
    </>
  );
}
