import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Destination } from '../types';
import {
  WORLD_HALF, fbm, generateBoulders, getWorld, rng, terrainHeight, inColdShadow,
} from './terrain';
import { earthTexture, glowSprite, groundDetail, marsGlobeTexture, moonGlobeTexture } from './textures';

// ---------------------------------------------------------------------------------------------
// Materials shared across scenes
// ---------------------------------------------------------------------------------------------
export const MAT = {
  hull: new THREE.MeshStandardMaterial({ color: '#d7dde6', roughness: 0.55, metalness: 0.35 }),
  hullDark: new THREE.MeshStandardMaterial({ color: '#566070', roughness: 0.5, metalness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: '#c99b2d', roughness: 0.35, metalness: 0.85 }),
  glass: new THREE.MeshStandardMaterial({ color: '#7fd4ff', roughness: 0.1, metalness: 0.2, emissive: '#2a8bd0', emissiveIntensity: 0.6 }),
  solar: new THREE.MeshStandardMaterial({ color: '#142a5a', roughness: 0.3, metalness: 0.7, emissive: '#0a1a3c', emissiveIntensity: 0.4 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: 0.95, metalness: 0.05 }),
};

// ---------------------------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------------------------
export function Starfield({ count = 1800, radius = 1800, size = 2.2 }: { count?: number; radius?: number; size?: number }) {
  const geo = useMemo(() => {
    const rand = rng(4242);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(t) * s * radius;
      pos[i * 3 + 1] = u * radius;
      pos[i * 3 + 2] = Math.sin(t) * s * radius;
      const b = 0.5 + rand() * 0.5;
      const warm = rand();
      col[i * 3] = b * (0.85 + warm * 0.15); col[i * 3 + 1] = b * 0.92; col[i * 3 + 2] = b * (1 - warm * 0.2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <points geometry={geo} frustumCulled={false} renderOrder={-10}>
      <pointsMaterial size={size} sizeAttenuation={false} vertexColors transparent depthWrite={false} fog={false} />
    </points>
  );
}

/** Keeps a group centred on the camera so skies never move relative to the viewer. */
export function FollowCamera({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => { if (ref.current) ref.current.position.copy(camera.position); });
  return <group ref={ref}>{children}</group>;
}

// ---------------------------------------------------------------------------------------------
// Planets used as backdrops
// ---------------------------------------------------------------------------------------------
export function Planet({ kind, radius, position, rotationSpeed = 0.01, atmosphere = true }: {
  kind: 'earth' | 'moon' | 'mars'; radius: number; position: [number, number, number]; rotationSpeed?: number; atmosphere?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const map = useMemo(() => (kind === 'earth' ? earthTexture() : kind === 'moon' ? moonGlobeTexture() : marsGlobeTexture()), [kind]);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * rotationSpeed; });
  const glow = kind === 'earth' ? '#5aa8ff' : '#ff9a5a';
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[radius, 64, 40]} />
        <meshStandardMaterial map={map} roughness={kind === 'earth' ? 0.7 : 0.95} metalness={0} />
      </mesh>
      {atmosphere && kind !== 'moon' && (
        <mesh scale={1.035}>
          <sphereGeometry args={[radius, 48, 32]} />
          <meshBasicMaterial color={glow} transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------------------------
const MOON_TONES = [new THREE.Color('#8c8b86'), new THREE.Color('#aeada6'), new THREE.Color('#6f7076')];
const MARS_TONES = [new THREE.Color('#8f4524'), new THREE.Color('#b56a3a'), new THREE.Color('#6e3320'), new THREE.Color('#c58a58')];

export function useTerrainGeometry(destination: Destination, segments: number): THREE.BufferGeometry {
  const geo = useMemo(() => {
    const size = WORLD_HALF * 2;
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const w = getWorld(destination);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(destination, x, z);
      pos.setY(i, h);
      const n = fbm(x * 0.02, z * 0.02, 5, 3);
      const n2 = fbm(x * 0.2, z * 0.2, 9, 2);
      if (destination === 'moon') {
        c.copy(MOON_TONES[0]).lerp(MOON_TONES[1], Math.max(0, n * 0.9 + 0.35)).lerp(MOON_TONES[2], Math.max(0, -n * 0.6));
        const shade = 0.88 + n2 * 0.12;
        c.multiplyScalar(shade);
        if (inColdShadow('moon', x, z)) c.multiplyScalar(0.6).lerp(new THREE.Color('#2b3a55'), 0.25);
      } else {
        const band = Math.sin(h * 1.3 + n * 4) * 0.5 + 0.5;
        c.copy(MARS_TONES[0]).lerp(MARS_TONES[1], Math.max(0, n * 0.8 + 0.4)).lerp(MARS_TONES[2], Math.max(0, -n * 0.7));
        if (h > 3) c.lerp(MARS_TONES[3], Math.min(0.55, (h - 3) / 34) * (0.5 + band * 0.6));
        c.multiplyScalar(0.9 + n2 * 0.12);
      }
      // around the landing pad: packed, slightly lighter ground
      const dp = Math.hypot(x - w.habitat.x, z - 8);
      if (dp < 28) c.lerp(new THREE.Color(destination === 'moon' ? '#9a9892' : '#c07a4a'), (1 - dp / 28) * 0.35);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [destination, segments]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

export function Terrain({ destination, lowPerf }: { destination: Destination; lowPerf: boolean }) {
  const geo = useTerrainGeometry(destination, lowPerf ? 160 : 256);
  const detail = useMemo(() => {
    const t = groundDetail(destination).clone();
    t.repeat.set(WORLD_HALF / 7, WORLD_HALF / 7);
    t.needsUpdate = true;
    return t;
  }, [destination]);
  useEffect(() => () => detail.dispose(), [detail]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors map={detail} bumpMap={detail} bumpScale={destination === 'moon' ? 0.35 : 0.3} roughness={1} metalness={0} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------
// Boulders (one draw call)
// ---------------------------------------------------------------------------------------------
function rockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 0.78 + fbm(x * 2.1 + 3, z * 2.1 + y, 7, 3) * 0.55;
    pos.setXYZ(i, x * n * 1.1, y * n * 0.7, z * n);
  }
  g.computeVertexNormals();
  return g;
}

export function Boulders({ destination, count }: { destination: Destination; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => generateBoulders(destination, count), [destination, count]);
  const geo = useMemo(() => rockGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const base = destination === 'moon' ? new THREE.Color('#77766f') : new THREE.Color('#8a4a2b');
    data.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(b.tilt, b.rotY, b.tilt * 0.5);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      col.copy(base).multiplyScalar(0.55 + b.tone * 0.7);
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data, destination]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, data.length]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial roughness={1} metalness={0} flatShading />
    </instancedMesh>
  );
}

/** Solid boulders as colliders (large ones only). */
export function boulderColliders(destination: Destination, count: number) {
  return generateBoulders(destination, count).filter((b) => b.solid).map((b) => ({ x: b.x, z: b.z, r: b.scale * 0.85 }));
}

// ---------------------------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------------------------
export function SurfaceLights({ destination, lowPerf }: { destination: Destination; lowPerf: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  const moon = destination === 'moon';
  // The south-pole Sun hugs the horizon (low angle = long shadows). Mars gets a higher Sun.
  const dir = useMemo(() => {
    const el = moon ? 0.11 : 0.5;
    const az = moon ? 0.7 : 2.4;
    return new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
  }, [moon]);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.position.copy(camera.position).addScaledVector(dir, 120);
    l.target.position.copy(camera.position);
    l.target.updateMatrixWorld();
  });

  return (
    <>
      <directionalLight
        ref={light}
        intensity={moon ? 4.2 : 2.8}
        color={moon ? '#fff8ec' : '#ffe2c0'}
        castShadow={!lowPerf}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60}
        shadow-camera-near={1} shadow-camera-far={300}
        shadow-bias={-0.0004} shadow-normalBias={0.05}
      />
      <hemisphereLight args={[moon ? '#8798bb' : '#d9a888', moon ? '#2a2a30' : '#5a3322', moon ? 2.1 : 1.3]} />
      <ambientLight intensity={moon ? 0.55 : 0.45} />
    </>
  );
}

export function sunDirection(destination: Destination): THREE.Vector3 {
  const moon = destination === 'moon';
  const el = moon ? 0.11 : 0.5;
  const az = moon ? 0.7 : 2.4;
  return new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
}

// ---------------------------------------------------------------------------------------------
// Skies
// ---------------------------------------------------------------------------------------------
export function MoonSky() {
  const dir = useMemo(() => sunDirection('moon'), []);
  const glow = useMemo(() => glowSprite(), []);
  return (
    <FollowCamera>
      <Starfield radius={1500} />
      {/* The Sun, just above the horizon */}
      <sprite position={dir.clone().multiplyScalar(1400)} scale={[260, 260, 1]}>
        <spriteMaterial map={glow} color="#fff4dc" transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      {/* Earth hanging low over the horizon, like the real view from the south pole */}
      <Planet kind="earth" radius={95} position={[-780, 330, -1100]} rotationSpeed={0.004} />
    </FollowCamera>
  );
}

const skyVert = /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `;
const skyFrag = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
void main(){
  float h = clamp(vDir.y, -0.2, 1.0);
  float t = pow(max(h, 0.0), 0.55);
  vec3 col = mix(uHorizon, uTop, t);
  float s = max(dot(normalize(vDir), uSunDir), 0.0);
  col += uSun * (pow(s, 600.0) * 2.0 + pow(s, 14.0) * 0.28);
  col = mix(col, uHorizon * 0.8, smoothstep(0.0, -0.2, vDir.y));
  gl_FragColor = vec4(col, 1.0);
}`;

export function MarsSky() {
  const dir = useMemo(() => sunDirection('mars'), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#6d5a64') }, uHorizon: { value: new THREE.Color('#d9a272') },
      uSun: { value: new THREE.Color('#bcd6ff') }, uSunDir: { value: dir.clone().normalize() },
    },
  }), [dir]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <FollowCamera>
      <mesh renderOrder={-20} material={mat}><sphereGeometry args={[1500, 32, 20]} /></mesh>
    </FollowCamera>
  );
}

// ---------------------------------------------------------------------------------------------
// Dust motes drifting near the camera (Mars wind, Moon kicked-up regolith when moving)
// ---------------------------------------------------------------------------------------------
export function DriftingDust({ color, count = 260, wind = 1.5, opacity = 0.35 }: { color: string; count?: number; wind?: number; opacity?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rand = rng(99);
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = (rand() - 0.5) * 60; p[i * 3 + 1] = rand() * 14; p[i * 3 + 2] = (rand() - 0.5) * 60; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  const tex = useMemo(() => glowSprite(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    pts.position.set(camera.position.x, 0, camera.position.z);
    const a = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let x = a.getX(i) + wind * 0.016;
      if (x > 30) x -= 60;
      a.setX(i, x);
      a.setY(i, ((a.getY(i) + 0.01 + Math.sin(t + i) * 0.003) % 14 + 14) % 14);
    }
    a.needsUpdate = true;
    pts.position.y = camera.position.y - 3;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial map={tex} color={color} size={0.5} transparent opacity={opacity} depthWrite={false} sizeAttenuation />
    </points>
  );
}

// ---------------------------------------------------------------------------------------------
// Habitat exterior (airlock door faces +z)
// ---------------------------------------------------------------------------------------------
export function HabitatExterior({ x, z, alert }: { x: number; z: number; alert?: boolean }) {
  const light = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const m = light.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.45 + Math.sin(s.clock.elapsedTime * (alert ? 6 : 2)) * 0.45;
  });
  return (
    <group position={[x, 0, z]}>
      {/* main pressure module */}
      <mesh position={[0, 3, -1]} castShadow receiveShadow material={MAT.hull}>
        <cylinderGeometry args={[7, 7.4, 6, 40]} />
      </mesh>
      <mesh position={[0, 6.1, -1]} castShadow material={MAT.hull}>
        <sphereGeometry args={[7, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* panel rings */}
      {[1.2, 3.2, 5].map((y) => (
        <mesh key={y} position={[0, y, -1]} material={MAT.hullDark}><cylinderGeometry args={[7.45, 7.45, 0.12, 40]} /></mesh>
      ))}
      {/* windows */}
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        return (
          <mesh key={i} position={[Math.sin(a) * 7.42, 3.6, -1 + Math.cos(a) * 7.42]} rotation={[0, a, 0]} material={MAT.glass}>
            <boxGeometry args={[1.1, 0.7, 0.12]} />
          </mesh>
        );
      })}
      {/* side modules */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 10.5, 0, -2]}>
          <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={MAT.hull}>
            <cylinderGeometry args={[1.9, 1.9, 7, 24]} />
          </mesh>
          <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.hullDark}>
            <cylinderGeometry args={[1.95, 1.95, 0.2, 24]} />
          </mesh>
        </group>
      ))}
      {/* airlock tube and door */}
      <mesh position={[0, 1.6, 7.6]} rotation={[Math.PI / 2, 0, 0]} castShadow material={MAT.hull}>
        <cylinderGeometry args={[1.5, 1.5, 3.2, 24]} />
      </mesh>
      <mesh position={[0, 1.55, 9.25]} material={MAT.hullDark}><boxGeometry args={[2.3, 2.6, 0.2]} /></mesh>
      <mesh position={[0, 1.55, 9.37]}><planeGeometry args={[1.5, 2.1]} /><meshBasicMaterial color="#112233" /></mesh>
      <mesh ref={light} position={[0, 3.1, 9.4]}>
        <boxGeometry args={[1.4, 0.18, 0.05]} />
        <meshBasicMaterial color={alert ? '#ff5a3a' : '#44ff99'} transparent />
      </mesh>
      <pointLight position={[0, 2.6, 10.6]} color={alert ? '#ff6a4a' : '#7dffc0'} intensity={6} distance={11} decay={2} />
      {/* comms dish and mast */}
      <group position={[-3.2, 9.2, -2]} rotation={[0.5, 0.6, 0]}>
        <mesh material={MAT.hull}><sphereGeometry args={[1.3, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} /></mesh>
        <mesh position={[0, 0.7, 0]} material={MAT.hullDark}><cylinderGeometry args={[0.05, 0.05, 1.4, 6]} /></mesh>
      </group>
      <mesh position={[3.6, 9, -2]} material={MAT.hullDark}><cylinderGeometry args={[0.07, 0.1, 5, 6]} /></mesh>
      <mesh position={[3.6, 11.6, -2]}><sphereGeometry args={[0.14, 8, 8]} /><meshBasicMaterial color="#ff4040" /></mesh>
      {/* landing pad ring */}
      <mesh position={[0, 0.04, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.6, 15, 64]} /><meshBasicMaterial color="#ffd24a" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export function SolarArray({ x, z, dust = 0 }: { x: number; z: number; dust?: number }) {
  const mat = useMemo(() => MAT.solar.clone(), []);
  useEffect(() => { mat.color.set('#142a5a').lerp(new THREE.Color('#7a6a58'), Math.min(0.7, dust / 120)); }, [dust, mat]);
  return (
    <group position={[x, 0, z]}>
      {[-3, 0, 3].map((px) => (
        <group key={px} position={[px, 0, 0]}>
          <mesh position={[0, 0.7, 0]} material={MAT.hullDark} castShadow><cylinderGeometry args={[0.1, 0.12, 1.4, 8]} /></mesh>
          <mesh position={[0, 1.9, 0.2]} rotation={[-0.55, 0, 0]} material={mat} castShadow receiveShadow>
            <boxGeometry args={[2.7, 0.08, 2.1]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.06, 0.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10.4, 3.2]} /><meshBasicMaterial color="#000" transparent opacity={0.18} /></mesh>
    </group>
  );
}

export function Lander({ x, z, mars = false }: { x: number; z: number; mars?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.2, 0]} castShadow material={MAT.gold}><cylinderGeometry args={[2.6, 3, 2.4, 8]} /></mesh>
      <mesh position={[0, 4.2, 0]} castShadow material={MAT.hull}><cylinderGeometry args={[1.8, 2.6, 1.8, 8]} /></mesh>
      <mesh position={[0, 5.6, 0]} castShadow material={MAT.hull}><coneGeometry args={[1.8, 1.6, 8]} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[3.3, 1.0, 0]} rotation={[0, 0, 0.7]} material={MAT.hullDark} castShadow><cylinderGeometry args={[0.1, 0.1, 3.4, 6]} /></mesh>
            <mesh position={[4.5, 0.08, 0]} material={MAT.hullDark}><cylinderGeometry args={[0.7, 0.7, 0.16, 12]} /></mesh>
          </group>
        );
      })}
      <mesh position={[0, 1, 3.2]} material={MAT.hullDark}><boxGeometry args={[0.1, 2.2, 0.8]} /></mesh>
      {mars && <mesh position={[0, 3.6, 0]} rotation={[0, 0, 0]}><torusGeometry args={[2.3, 0.12, 6, 24]} /><meshStandardMaterial color="#b0b6c0" /></mesh>}
    </group>
  );
}

export function Flag({ x, z, y = 0 }: { x: number; z: number; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 1.4, 0]} material={MAT.hull}><cylinderGeometry args={[0.025, 0.025, 2.8, 6]} /></mesh>
      <mesh position={[0.55, 2.4, 0]}><planeGeometry args={[1.1, 0.7]} /><meshStandardMaterial color="#e8eef8" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.55, 2.4, 0.003]}><planeGeometry args={[1.1, 0.12]} /><meshStandardMaterial color="#cc2a3a" side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

export function HeritageMemorial({ x, z, done }: { x: number; z: number; done: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]} material={MAT.hullDark} castShadow receiveShadow><cylinderGeometry args={[1.4, 1.6, 0.5, 6]} /></mesh>
      <mesh position={[0, 0.9, 0]} rotation={[-0.35, 0, 0]} castShadow><boxGeometry args={[1.5, 0.08, 0.9]} /><meshStandardMaterial color={done ? '#ffd97a' : '#c9a24a'} metalness={0.9} roughness={0.35} /></mesh>
      {/* Armstrong's bootprint, remembered in a pressed-metal tile */}
      <mesh position={[0, 0.2, 1.85]} rotation={[-Math.PI / 2, 0, 0.2]}><planeGeometry args={[0.5, 1.2]} /><meshStandardMaterial color="#555450" roughness={1} /></mesh>
      <Flag x={-1.9} z={-0.4} />
    </group>
  );
}

export function SampleStation({ x, z, done, destination }: { x: number; z: number; done: boolean; destination: Destination }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow material={MAT.hullDark}><boxGeometry args={[1.4, 1.8, 1.0]} /></mesh>
      <mesh position={[0, 2.1, 0]} castShadow material={MAT.hull}><cylinderGeometry args={[0.1, 0.1, 1.6, 8]} /></mesh>
      <mesh position={[0.5, 1.2, 0.52]}><boxGeometry args={[0.5, 0.35, 0.04]} /><meshBasicMaterial color={done ? '#44ff99' : '#ffb84a'} /></mesh>
      {/* sample tray */}
      <mesh position={[0, 0.06, 1.3]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.9, 20]} /><meshStandardMaterial color={destination === 'moon' ? '#3a3a38' : '#5a2a18'} roughness={1} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// Rover (shared between Moon and Mars; the `variant` changes paint and equipment)
// ---------------------------------------------------------------------------------------------
export function RoverModel({ variant, charging, driving }: { variant: Destination; charging?: boolean; driving?: boolean }) {
  const moon = variant === 'moon';
  const wheelZ = [-1.5, 0, 1.5];
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow material={MAT.hull}><boxGeometry args={[2.2, 0.5, 3.6]} /></mesh>
      <mesh position={[0, 0.62, 0]} material={MAT.hullDark}><boxGeometry args={[2.0, 0.25, 3.4]} /></mesh>
      {/* cargo / sample bay */}
      <mesh position={[0, 1.25, 1.15]} castShadow material={MAT.hullDark}><boxGeometry args={[1.8, 0.3, 1.3]} /></mesh>
      {/* seats and roll frame */}
      {[-0.5, 0.5].map((sx) => (
        <mesh key={sx} position={[sx, 1.25, -0.5]} castShadow material={MAT.rubber}><boxGeometry args={[0.55, 0.5, 0.6]} /></mesh>
      ))}
      <mesh position={[0, 2.05, -0.8]} material={MAT.hull}><boxGeometry args={[1.8, 0.07, 0.07]} /></mesh>
      {[-0.9, 0.9].map((sx) => (
        <mesh key={sx} position={[sx, 1.6, -0.8]} material={MAT.hull}><boxGeometry args={[0.07, 1.0, 0.07]} /></mesh>
      ))}
      {/* mast + camera + dish */}
      <mesh position={[0.7, 2.0, 1.3]} material={MAT.hull}><cylinderGeometry args={[0.04, 0.04, 1.6, 6]} /></mesh>
      <mesh position={[0.7, 2.85, 1.3]} material={MAT.hullDark}><boxGeometry args={[0.35, 0.18, 0.2]} /></mesh>
      <mesh position={[-0.7, 2.2, 1.0]} rotation={[0.7, 0.3, 0]} material={MAT.hull}><sphereGeometry args={[0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.3]} /></mesh>
      {/* solar roof */}
      <mesh position={[0, 2.15, -0.8]} rotation={[0.05, 0, 0]} material={MAT.solar}><boxGeometry args={[1.9, 0.05, 1.4]} /></mesh>
      {/* wheels */}
      {[-1, 1].flatMap((side) => wheelZ.map((wz) => (
        <group key={`${side}${wz}`} position={[side * 1.3, 0.5, wz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={MAT.rubber}><cylinderGeometry args={[0.5, 0.5, 0.45, 20]} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[side * 0.22, 0, 0]} material={MAT.hull}><cylinderGeometry args={[0.22, 0.22, 0.05, 12]} /></mesh>
        </group>
      )))}
      <mesh position={[0, 0.9, 1.9]}><boxGeometry args={[1.2, 0.12, 0.05]} /><meshBasicMaterial color={charging ? '#44ff99' : driving ? '#9ad7ff' : '#ffe9a0'} /></mesh>
      {!moon && <mesh position={[0.9, 1.4, 1.2]} rotation={[0, 0, -0.5]} material={MAT.hullDark}><cylinderGeometry args={[0.05, 0.05, 1.2, 6]} /></mesh>}
    </group>
  );
}

export function ChargePad({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.05, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5, 6]} /><meshStandardMaterial color="#2a2f38" roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[2.2, 2.35, 4]} /><meshBasicMaterial color="#59d6ff" /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// Site beacons: tall, soft light columns that read from far away
// ---------------------------------------------------------------------------------------------
export function Beacon({ x, z, done, destination, height = 38 }: { x: number; z: number; done: boolean; destination: Destination; height?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const y = terrainHeight(destination, x, z);
  useFrame((s) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = (done ? 0.12 : 0.22) + Math.sin(s.clock.elapsedTime * 1.6 + x) * 0.05;
  });
  return (
    <group position={[x, y, z]}>
      <mesh ref={ref} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.35, 1.1, height, 12, 1, true]} />
        <meshBasicMaterial color={done ? '#44ff99' : '#4fd2ff'} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.9, 40]} />
        <meshBasicMaterial color={done ? '#44ff99' : '#4fd2ff'} transparent opacity={0.8} fog={false} />
      </mesh>
    </group>
  );
}
