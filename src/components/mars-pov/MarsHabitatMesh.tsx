import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Mars habitat — dusty, weathered variant of the lunar habitat
export function MarsHabitatMesh() {
  const navLight1 = useRef<THREE.PointLight>(null);
  const navLight2 = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const t = Date.now() * 0.0010;
    const blink = Math.sin(t * Math.PI) > 0.5 ? 1.0 : 0.0;
    if (navLight1.current) navLight1.current.intensity = blink;
    if (navLight2.current) navLight2.current.intensity = blink;
  });

  // Ochre-tinted, Mars-weathered material colours
  const panelColor = '#9a8a7a';        // dusty aluminium
  const panelMetal = 0.55;
  const panelRough = 0.52;
  const domeColor = '#c4b4a4';

  return (
    <group position={[-20, 0, -38]}>

      {/* ── Interior warm glow (Mars hab uses warmer LEDs) ── */}
      <pointLight position={[0, 2.5, 0]} color="#ffcc88" intensity={0.7} distance={16} />

      {/* ── Main cylindrical habitat module (dust-tinted) ── */}
      <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.6, 4.2, 24]} />
        <meshStandardMaterial color={panelColor} metalness={panelMetal} roughness={panelRough} />
      </mesh>

      {/* ── Dust accumulation layer on top surfaces ── */}
      <mesh position={[0, 4.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 24]} />
        <meshStandardMaterial
          color="#8b5a30"
          transparent
          opacity={0.35}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* ── Pressurised connecting tunnel ── */}
      <mesh position={[0, 1.4, 4.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 3.2, 20]} />
        <meshStandardMaterial color="#8a7a6a" metalness={0.6} roughness={0.45} />
      </mesh>

      {/* ── Domed cap ── */}
      <mesh position={[0, 4.3, 0]}>
        <sphereGeometry args={[3.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={domeColor} metalness={0.45} roughness={0.4} />
      </mesh>

      {/* ── Airlock cylinder ── */}
      <mesh position={[0, 1.1, 5.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 1.4, 20]} />
        <meshStandardMaterial color="#7a6a5a" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* ── Airlock hatch ring ── */}
      <mesh position={[0, 1.1, 6.42]}>
        <torusGeometry args={[1.02, 0.09, 12, 32]} />
        <meshStandardMaterial color="#aaa090" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* ── Warm glowing windows ── */}
      {[-1.5, 1.5].map((xOff) => (
        <mesh key={xOff} position={[xOff, 2.4, 3.21]}>
          <boxGeometry args={[1.0, 0.75, 0.05]} />
          <meshStandardMaterial
            color="#ffcc88"
            emissive="#ff8820"
            emissiveIntensity={1.4}
            transparent
            opacity={0.88}
          />
        </mesh>
      ))}

      {/* ── Solar panels (dusty — reduced efficiency) ── */}
      <mesh position={[-8.5, 3.0, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[11, 0.08, 3.2]} />
        <meshStandardMaterial
          color="#2a3010"
          metalness={0.75}
          roughness={0.28}
          emissive="#181808"
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[8.5, 3.0, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[11, 0.08, 3.2]} />
        <meshStandardMaterial
          color="#2a3010"
          metalness={0.75}
          roughness={0.28}
          emissive="#181808"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* ── Solar panel struts ── */}
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]}>
          <boxGeometry args={[0.18, 1.0, 0.18]} />
          <meshStandardMaterial color="#706050" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}

      {/* ── Antenna mast ── */}
      <mesh position={[0, 7.4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 4.0, 8]} />
        <meshStandardMaterial color="#b0a090" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* ── Antenna dish ── */}
      <mesh position={[0.6, 9.5, 0]} rotation={[0.4, 0, 0.2]}>
        <sphereGeometry args={[0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8b8a0" metalness={0.75} roughness={0.3} side={THREE.BackSide} />
      </mesh>

      {/* ── Nav lights (amber on Mars instead of red) ── */}
      <pointLight ref={navLight1} position={[0, 9.6, 0]} color="#ff8800" distance={18} />
      <pointLight ref={navLight2} position={[0, 9.6, 0.2]} color="#ff8800" distance={6} />

      {/* ── Mars Rover silhouette (simple box rover) ── */}
      <group position={[14, 0.3, -6]}>
        {/* Body */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[2.4, 0.8, 1.6]} />
          <meshStandardMaterial color="#8a7a60" metalness={0.5} roughness={0.6} />
        </mesh>
        {/* Wheel × 4 */}
        {[[-1.1, 0, -0.9], [1.1, 0, -0.9], [-1.1, 0, 0.9], [1.1, 0, 0.9]].map(([wx, wy, wz], i) => (
          <mesh key={i} position={[wx, wy + 0.4, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 12]} />
            <meshStandardMaterial color="#2a2018" roughness={1} metalness={0} />
          </mesh>
        ))}
        {/* Camera mast */}
        <mesh position={[0, 1.9, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
          <meshStandardMaterial color="#c0b090" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Camera head */}
        <mesh position={[0.08, 2.55, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="#808070" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* ── Landing pad ── */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6, 9, 32]} />
        <meshStandardMaterial color="#2a1808" metalness={0.3} roughness={0.9} />
      </mesh>

      {/* ── Pad corner markers (orange on Mars) ── */}
      {[[7, 7], [-7, 7], [7, -7], [-7, -7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]}>
          <boxGeometry args={[0.6, 0.12, 0.6]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={0.9}
          />
        </mesh>
      ))}

    </group>
  );
}
