import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface LunarTerrainProps {
  lowPerformanceMode?: boolean;
}

// Deterministic height function — same formula used for displacement and eye-height grounding
export function lunarHeight(x: number, z: number): number {
  const distFromOrigin = Math.sqrt(x * x + z * z);
  if (distFromOrigin < 15) return 0; // flat landing pad

  // Layered rolling hills
  let y =
    Math.sin(x * 0.045 + 0.3)   * 2.0 +
    Math.sin(z * 0.038 - 0.7)   * 1.8 +
    Math.sin(x * 0.09 + z * 0.07) * 0.9 +
    Math.cos(x * 0.025 - z * 0.03) * 2.6 +
    Math.sin((x + z) * 0.055)   * 1.1 +
    Math.sin(x * 0.18 - z * 0.14) * 0.4; // micro-bumps

  // Crater bowls: [cx, cz, radius, depth]
  const craters: [number, number, number, number][] = [
    [42,  28, 16, 3.0],
    [-62,-22, 20, 3.8],
    [82, -48, 12, 2.2],
    [-32, 72, 14, 2.6],
    [105,  8,  9, 1.6],
    [-92,-58, 22, 4.2],
    [55, -90, 11, 1.8],
    [-50, 110, 8, 1.4],
  ];

  for (const [cx, cz, radius, depth] of craters) {
    const dx = x - cx;
    const dz = z - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < radius * 1.4) {
      const t = dist / radius;
      if (t < 1.0) {
        const bowl = Math.cos(t * Math.PI * 0.5);
        y -= bowl * depth;
      }
      // Raised ejecta rim
      if (t >= 0.85 && t < 1.4) {
        const rimT = (t - 0.85) / 0.55;
        y += Math.sin(rimT * Math.PI) * depth * 0.4;
      }
    }
  }

  return y;
}

export function LunarTerrain({ lowPerformanceMode = false }: LunarTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const segments = lowPerformanceMode ? 64 : 128;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    // Add vertex colours for visual variety
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // PlaneGeometry is in XZ before rotation, but after rotation baking
      // the plane is created in XY — we read X and Y pre-rotation
      const x = pos.getX(i);
      const z = pos.getY(i); // Y in un-rotated plane = Z in world

      const y = lunarHeight(x, z);
      pos.setZ(i, y); // Z in un-rotated plane = Y in world (height)

      // Vertex colours: lighter near landing pad + craters, slight variation
      const base = 0.46 + Math.sin(x * 0.1 + z * 0.08) * 0.04;
      const proximity = Math.sqrt(x * x + z * z);
      const lightening = proximity < 20 ? 0.06 : 0;
      const r = base + lightening;
      const g = base + lightening;
      const b = base + lightening + 0.01; // very slight blue tint in shadows

      colors[i * 3]     = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [segments]);

  return (
    <>
      {/* Main terrain */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400, segments, segments]} />
        <meshStandardMaterial
          vertexColors
          roughness={0.98}
          metalness={0.0}
        />
      </mesh>

      {/* Sky wall — large hemisphere so terrain doesn't end abruptly */}
      <mesh>
        <sphereGeometry args={[480, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#000005" side={THREE.BackSide} />
      </mesh>

      {/* Distant mountain ridge silhouette (simple bumpy torus) */}
      <mesh position={[0, -6, 0]} rotation={[0, 0.4, 0]}>
        <torusGeometry args={[200, 18, 8, 48]} />
        <meshStandardMaterial color="#2a2a28" roughness={1} metalness={0} />
      </mesh>
    </>
  );
}
