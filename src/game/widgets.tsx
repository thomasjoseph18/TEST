import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAT } from './props';

type V3 = [number, number, number];

/** A small screen that redraws a few lines of live text a couple of times per second. */
export function LiveScreen({ p, size, rot = [0, 0, 0], lines, accent }: { p: V3; size: [number, number]; rot?: V3; lines: () => string[]; accent: string }) {
  const { tex, ctx, cv } = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * (size[1] / size[0]));
    const ctx = cv.getContext('2d')!;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return { tex, ctx, cv };
  }, [size]);
  const acc = useRef(0);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.5) return;
    acc.current = 0;
    ctx.fillStyle = '#04101c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(3, 3, cv.width - 6, cv.height - 6);
    ctx.fillStyle = accent; ctx.font = 'bold 20px monospace';
    lines().forEach((l, i) => ctx.fillText(l, 14, 32 + i * 26));
    tex.needsUpdate = true;
  });
  return <mesh position={p} rotation={rot}><planeGeometry args={size} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>;
}

export function StatusLight({ p, level }: { p: V3; level: () => number }) {
  const ref = useRef<THREE.Mesh>(null);
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.4 || !ref.current) return;
    acc.current = 0;
    const v = level();
    (ref.current.material as THREE.MeshBasicMaterial).color.set(v > 50 ? '#44ff99' : v > 25 ? '#ffc94a' : '#ff5a4a');
  });
  return <mesh ref={ref} position={p}><sphereGeometry args={[0.1, 10, 10]} /><meshBasicMaterial color="#44ff99" /></mesh>;
}


/** N.O.V.A., the companion robot: a hovering white capsule body with a dark visor and cyan eyes. */
export function NovaBot({ position, scale = 1, faceCamera = true }: { position: V3; scale?: number; faceCamera?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (g.current) {
      g.current.position.y = position[1] + Math.sin(t * 1.6) * 0.07;
      if (faceCamera) {
        const dx = s.camera.position.x - g.current.position.x;
        const dz = s.camera.position.z - g.current.position.z;
        const want = Math.atan2(dx, dz);
        g.current.rotation.y += (((want - g.current.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.06;
      }
    }
    if (head.current) head.current.rotation.z = Math.sin(t * 0.9) * 0.08;
  });
  return (
    <group ref={g} position={position} scale={scale}>
      <mesh position={[0, 0.55, 0]} material={MAT.hull} castShadow><capsuleGeometry args={[0.26, 0.4, 6, 16]} /></mesh>
      <mesh position={[0, 0.55, 0.2]}><circleGeometry args={[0.1, 16]} /><meshBasicMaterial color="#59d6ff" /></mesh>
      <group ref={head} position={[0, 1.12, 0]}>
        <mesh material={MAT.hull} castShadow><sphereGeometry args={[0.3, 24, 18]} /></mesh>
        <mesh position={[0, 0, 0.12]}><sphereGeometry args={[0.24, 20, 14, -1, 2, 0.9, 1.4]} /><meshStandardMaterial color="#071322" roughness={0.1} metalness={0.8} /></mesh>
        <mesh position={[-0.1, 0.02, 0.27]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color="#6fe8ff" /></mesh>
        <mesh position={[0.1, 0.02, 0.27]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color="#6fe8ff" /></mesh>
        <mesh position={[0, 0.33, 0]} material={MAT.hullDark}><cylinderGeometry args={[0.015, 0.015, 0.16, 6]} /></mesh>
        <mesh position={[0, 0.43, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshBasicMaterial color="#ffb84a" /></mesh>
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.36, 0.55, 0]} rotation={[0, 0, s * 0.35]} material={MAT.hull}><capsuleGeometry args={[0.06, 0.28, 4, 8]} /></mesh>
      ))}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.12, 0.2, 20]} /><meshBasicMaterial color="#59d6ff" transparent opacity={0.6} /></mesh>
    </group>
  );
}

/** A suited astronaut figure (non-interactive crewmate). */
export function AstronautFigure({ position, rotY = 0 }: { position: V3; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.15, 0]} material={MAT.hull} castShadow><capsuleGeometry args={[0.3, 0.55, 6, 14]} /></mesh>
      <mesh position={[0, 0.5, 0]} material={MAT.hull} castShadow><capsuleGeometry args={[0.2, 0.55, 6, 10]} /></mesh>
      <mesh position={[0, 1.2, -0.32]} material={MAT.hullDark} castShadow><boxGeometry args={[0.5, 0.65, 0.2]} /></mesh>
      <mesh position={[0, 1.78, 0]} material={MAT.hull} castShadow><sphereGeometry args={[0.28, 20, 16]} /></mesh>
      <mesh position={[0, 1.78, 0.1]}><sphereGeometry args={[0.22, 16, 12, -1.3, 2.6, 0.8, 1.5]} /><meshStandardMaterial color="#d9a93a" metalness={0.95} roughness={0.15} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.4, 1.2, 0]} rotation={[0, 0, s * 0.25]} material={MAT.hull}><capsuleGeometry args={[0.1, 0.5, 4, 8]} /></mesh>)}
      <mesh position={[0, 1.4, 0.3]}><boxGeometry args={[0.18, 0.12, 0.04]} /><meshBasicMaterial color="#59d6ff" /></mesh>
    </group>
  );
}
