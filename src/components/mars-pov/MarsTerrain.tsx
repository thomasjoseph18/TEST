import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface MarsTerrainProps {
  lowPerformanceMode?: boolean;
}

// Deterministic height function — exported for camera grounding in MarsSurfaceScene
export function marsHeight(x: number, z: number): number {
  const distFromOrigin = Math.sqrt(x * x + z * z);
  if (distFromOrigin < 14) return 0; // flat landing pad

  // Jezero Crater-inspired: gentle basin depression towards origin
  const basinDepth = Math.max(0, 1.0 - distFromOrigin / 90) * 2.5;

  let y =
    Math.sin(x * 0.038 + 0.9) * 1.6 +
    Math.sin(z * 0.044 - 0.5) * 1.4 +
    Math.sin(x * 0.078 + z * 0.055) * 0.7 +
    Math.cos(x * 0.022 - z * 0.028) * 2.0 +
    Math.sin((x + z) * 0.048) * 0.9 +
    Math.sin(x * 0.14 - z * 0.11) * 0.3; // micro texture

  y -= basinDepth;

  // Flatter, eroded craters (Martian wind erosion softens rims)
  const craters: [number, number, number, number][] = [
    [ 55,  38, 18, 2.4],
    [-68, -30, 22, 3.0],
    [ 90, -52, 14, 1.8],
    [-35,  78, 16, 2.0],
    [112,  12, 10, 1.4],
    [-88, -62, 20, 2.6],
  ];

  for (const [cx, cz, radius, depth] of craters) {
    const dx = x - cx;
    const dz = z - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < radius * 1.3) {
      const t = dist / radius;
      if (t < 1.0) {
        const bowl = Math.cos(t * Math.PI * 0.5);
        y -= bowl * depth;
      }
      // Softened ejecta rim (eroded by Martian dust storms)
      if (t >= 0.90 && t < 1.3) {
        const rimT = (t - 0.90) / 0.40;
        y += Math.sin(rimT * Math.PI) * depth * 0.25; // flatter than lunar
      }
    }
  }

  // Delta fan feature: gentle raised ridge to north-west (Jezero fan)
  const dxFan = x - (-40);
  const dzFan = z - (-70);
  const fanDist = Math.sqrt(dxFan * dxFan + dzFan * dzFan);
  if (fanDist < 50) {
    y += (1.0 - fanDist / 50) * 2.8 * Math.sin(dxFan * 0.06 + dzFan * 0.04);
  }

  return y;
}

export function MarsTerrain({ lowPerformanceMode = false }: MarsTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const segments = lowPerformanceMode ? 64 : 128;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // Y in un-rotated plane = Z in world

      const y = marsHeight(x, z);
      pos.setZ(i, y);

      // Martian reddish-orange colour blend
      const base = 0.42 + Math.sin(x * 0.09 + z * 0.07) * 0.06;
      const redness = 0.52 + Math.cos(x * 0.05 - z * 0.04) * 0.08;
      const proximity = Math.sqrt(x * x + z * z);
      const padLight = proximity < 18 ? 0.05 : 0;

      // Red channel dominant (ochre/rusty), green low, blue minimal
      colors[i * 3]     = redness + padLight;         // R (0.44–0.60)
      colors[i * 3 + 1] = base * 0.52 + padLight;    // G (0.19–0.28)
      colors[i * 3 + 2] = base * 0.18 + padLight;    // B (0.07–0.14)
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
          roughness={0.97}
          metalness={0.02}
        />
      </mesh>

      {/* Sky wall — terracotta hemisphere so edges don't show */}
      <mesh>
        <sphereGeometry args={[480, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#1a0800" side={THREE.BackSide} />
      </mesh>

      {/* Distant mesa/ridge silhouette — lower than lunar mountains */}
      <mesh position={[0, -4, 0]} rotation={[0, 0.8, 0]}>
        <torusGeometry args={[195, 12, 6, 48]} />
        <meshStandardMaterial color="#3d1a08" roughness={1} metalness={0} />
      </mesh>

      {/* Scattered surface rocks */}
      {[
        [18, 0, -22, 1.2], [-26, 0, 15, 0.8], [32, 0, 8, 1.5],
        [-12, 0, 32, 0.6], [44, 0, -8, 1.0], [-38, 0, -18, 0.9],
        [22, 0, 44, 0.7], [-55, 0, 28, 1.3], [60, 0, -35, 1.1],
        [-42, 0, 60, 0.8], [80, 0, 20, 0.6], [-70, 0, -44, 1.4],
      ].map(([x, _y, z, s], i) => (
        <mesh key={i} position={[x, marsHeight(x, z) + (s as number) * 0.3, z]}>
          <dodecahedronGeometry args={[s as number, 0]} />
          <meshStandardMaterial
            color="#6b2d10"
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      ))}
    </>
  );
}
