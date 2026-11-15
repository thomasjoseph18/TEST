import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function HabitatMesh() {
  const navLight1 = useRef<THREE.PointLight>(null);
  const navLight2 = useRef<THREE.PointLight>(null);

  // Blink navigation lights
  useFrame(() => {
    const t = Date.now() * 0.0012;
    const blink = Math.sin(t * Math.PI) > 0.5 ? 1.2 : 0.0;
    if (navLight1.current) navLight1.current.intensity = blink;
    if (navLight2.current) navLight2.current.intensity = blink;
  });

  return (
    // Moved closer to player start: [-20, 0, -38]. Scale up × 1.4 vs original.
    <group position={[-20, 0, -38]}>

      {/* ── Interior glow ── */}
      <pointLight position={[0, 2.5, 0]} color="#8899ff" intensity={0.8} distance={16} />

      {/* ── Main cylindrical habitat module ── */}
      <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.6, 4.2, 24]} />
        <meshStandardMaterial color="#aab4be" metalness={0.65} roughness={0.38} />
      </mesh>

      {/* ── Pressurised connecting tunnel (front) ── */}
      <mesh position={[0, 1.4, 4.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 3.2, 20]} />
        <meshStandardMaterial color="#8a9aaa" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* ── Domed cap (top) ── */}
      <mesh position={[0, 4.3, 0]}>
        <sphereGeometry args={[3.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8d2dc" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* ── Airlock cylinder (front) ── */}
      <mesh position={[0, 1.1, 5.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 1.4, 20]} />
        <meshStandardMaterial color="#7a8c9c" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* ── Airlock hatch ring ── */}
      <mesh position={[0, 1.1, 6.42]}>
        <torusGeometry args={[1.02, 0.09, 12, 32]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Glowing windows (front face) ── */}
      {[-1.5, 1.5].map((xOff) => (
        <mesh key={xOff} position={[xOff, 2.4, 3.21]}>
          <boxGeometry args={[1.0, 0.75, 0.05]} />
          <meshStandardMaterial
            color="#aaccff"
            emissive="#5588ff"
            emissiveIntensity={1.6}
            transparent
            opacity={0.88}
          />
        </mesh>
      ))}

      {/* ── Left solar panel ── */}
      <mesh position={[-8.5, 3.0, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[11, 0.08, 3.2]} />
        <meshStandardMaterial color="#1a2a4c" metalness={0.88} roughness={0.12} emissive="#0a1424" emissiveIntensity={0.2} />
      </mesh>

      {/* ── Right solar panel ── */}
      <mesh position={[8.5, 3.0, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[11, 0.08, 3.2]} />
        <meshStandardMaterial color="#1a2a4c" metalness={0.88} roughness={0.12} emissive="#0a1424" emissiveIntensity={0.2} />
      </mesh>

      {/* ── Solar panel struts ── */}
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]}>
          <boxGeometry args={[0.18, 1.0, 0.18]} />
          <meshStandardMaterial color="#8090a0" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* ── Antenna mast ── */}
      <mesh position={[0, 7.4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 4.0, 8]} />
        <meshStandardMaterial color="#c0c8d0" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Antenna dish ── */}
      <mesh position={[0.6, 9.5, 0]} rotation={[0.4, 0, 0.2]}>
        <sphereGeometry args={[0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d0d8e0" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Blinking nav lights at antenna tip ── */}
      <pointLight ref={navLight1} position={[0, 9.6, 0]} color="#ff2020" distance={18} />
      <pointLight ref={navLight2} position={[0, 9.6, 0.2]} color="#ff2020" distance={6} />

      {/* ── Landing pad ring ── */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6, 9, 32]} />
        <meshStandardMaterial color="#2a3040" metalness={0.3} roughness={0.9} />
      </mesh>

      {/* ── Pad corner markers ── */}
      {[[7, 7], [-7, 7], [7, -7], [-7, -7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]}>
          <boxGeometry args={[0.6, 0.12, 0.6]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffee00"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}

    </group>
  );
}
