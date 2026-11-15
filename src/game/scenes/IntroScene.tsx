import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAT, Planet, Starfield } from '../props';
import { glowSprite } from '../textures';
import { APOLLO13_BEATS, beatAt, type BeatScene } from '../../data/apollo13';

interface Props {
  timeRef: MutableRefObject<number>;
  reducedMotion: boolean;
  onReady: () => void;
}

const EARTH = new THREE.Vector3(-170, -40, -90);
const MOON = new THREE.Vector3(260, 20, -60);
const SPLASH = new THREE.Vector3(4000, 0, 0);

const TRAJECTORY = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(90, 8, -10), new THREE.Vector3(180, 22, -20), new THREE.Vector3(230, 38, -70),
  new THREE.Vector3(262, 22, -112), new THREE.Vector3(302, 10, -70), new THREE.Vector3(270, -5, -20), new THREE.Vector3(200, -10, 0),
  new THREE.Vector3(120, -15, 0), new THREE.Vector3(30, -8, 6), new THREE.Vector3(-60, -22, -20), new THREE.Vector3(-100, -30, -42),
], false, 'catmullrom', 0.4);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => t * t * (3 - 2 * t);

/** Start time and total length of the run of beats that share the current beat's scene. */
function sceneSpan(index: number): { start: number; dur: number } {
  const scene = APOLLO13_BEATS[index].scene;
  let a = index;
  while (a > 0 && APOLLO13_BEATS[a - 1].scene === scene) a--;
  let b = index;
  while (b < APOLLO13_BEATS.length - 1 && APOLLO13_BEATS[b + 1].scene === scene) b++;
  const start = APOLLO13_BEATS[a].start;
  return { start, dur: APOLLO13_BEATS[b].start + APOLLO13_BEATS[b].duration - start };
}

export const BANG_TIME = (() => {
  const b = APOLLO13_BEATS.find((x) => x.id === 'bang');
  return (b ? b.start : 0) + 2.2;
})();

function Odyssey({ powered }: { powered: boolean }) {
  return (
    <group>
      {/* command module */}
      <mesh position={[2.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.hull} castShadow><coneGeometry args={[1.1, 1.9, 32]} /></mesh>
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.hullDark}><cylinderGeometry args={[1.12, 1.12, 0.12, 32]} /></mesh>
      {/* service module */}
      <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.hull} castShadow><cylinderGeometry args={[1.12, 1.12, 3.4, 32]} /></mesh>
      {[-1.6, -0.6, 0.4].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.hullDark}><cylinderGeometry args={[1.14, 1.14, 0.08, 32]} /></mesh>)}
      <mesh position={[-2.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.gold}><cylinderGeometry args={[0.35, 0.8, 0.9, 20, 1, true]} /></mesh>
      <mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.1, 12]} /><meshBasicMaterial color={powered ? '#9ad7ff' : '#1a2230'} /></mesh>
      {/* high-gain antenna */}
      <mesh position={[-1.2, 1.4, 0]} rotation={[0, 0, 0.9]} material={MAT.hull}><sphereGeometry args={[0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4]} /></mesh>
      {/* docking tunnel */}
      <mesh position={[3.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.hullDark}><cylinderGeometry args={[0.35, 0.35, 0.5, 16]} /></mesh>
    </group>
  );
}

function Aquarius({ lit }: { lit: boolean }) {
  return (
    <group position={[5.6, 0, 0]}>
      <mesh rotation={[0, 0, 0]} material={MAT.gold} castShadow><boxGeometry args={[2.0, 1.8, 1.8]} /></mesh>
      <mesh position={[0.8, 0.9, 0]} material={MAT.hull} castShadow><cylinderGeometry args={[0.8, 0.9, 0.9, 10]} /></mesh>
      <mesh position={[0.2, -1.35, 0]} material={MAT.gold}><cylinderGeometry args={[0.9, 1.0, 1.0, 8]} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i} position={[0.2, -1.2, 0]} rotation={[a, 0, 0]}>
            <mesh position={[0, -1.3, 1.1]} rotation={[0.5, 0, 0]} material={MAT.hullDark}><cylinderGeometry args={[0.05, 0.05, 1.9, 6]} /></mesh>
            <mesh position={[0, -2.2, 1.7]} material={MAT.hullDark}><cylinderGeometry args={[0.35, 0.35, 0.06, 12]} /></mesh>
          </group>
        );
      })}
      {/* triangular windows glow when the lifeboat is lit */}
      {[-0.25, 0.25].map((z) => <mesh key={z} position={[1.1, 0.35, z * 2]}><boxGeometry args={[0.05, 0.3, 0.3]} /><meshBasicMaterial color={lit ? '#ffe6a8' : '#10151f'} /></mesh>)}
    </group>
  );
}

function Orion({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[1.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.hull} castShadow><coneGeometry args={[1.3, 1.4, 32]} /></mesh>
      <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.hullDark} castShadow><cylinderGeometry args={[1.2, 1.2, 2.2, 32]} /></mesh>
      <mesh position={[-1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.gold}><cylinderGeometry args={[0.3, 0.7, 0.8, 20, 1, true]} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[-0.3, 0, 0]} rotation={[(i / 4) * Math.PI * 2 + Math.PI / 4, 0, 0]}>
          <mesh position={[0, 3.3, 0]} material={MAT.solar}><boxGeometry args={[1.5, 4.4, 0.05]} /></mesh>
          <mesh position={[0, 1.4, 0]} material={MAT.hullDark}><boxGeometry args={[0.1, 0.9, 0.1]} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Capsule under three parachutes over the Pacific. */
function Splashdown({ timeRef }: { timeRef: MutableRefObject<number> }) {
  const cap = useRef<THREE.Group>(null);
  const beat = APOLLO13_BEATS.find((b) => b.id === 'home')!;
  useFrame(() => {
    if (!cap.current) return;
    const u = clamp01((timeRef.current - beat.start) / (beat.duration * 0.92));
    cap.current.position.set(0, 70 - ease(u) * 66, 0);
    cap.current.rotation.z = Math.sin(timeRef.current * 1.3) * 0.06;
  });
  const chutes = [[-6, 0], [6, 0], [0, 6]];
  return (
    <group position={SPLASH}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[6000, 6000, 1, 1]} /><meshStandardMaterial color="#14598c" roughness={0.28} metalness={0.35} /></mesh>
      <group ref={cap}>
        <mesh material={MAT.hull} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[1.5, 2.3, 24]} /></mesh>
        {chutes.map(([x, z], i) => (
          <group key={i}>
            <mesh position={[x, 11, z]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[6.4, 20, 10, 0, Math.PI * 2, 0, 1.45]} /><meshStandardMaterial color={i % 2 ? '#e4543a' : '#f4f6fa'} side={THREE.DoubleSide} roughness={0.8} /></mesh>
            <mesh position={[x / 2, 5.6, z / 2]} rotation={[0, 0, x * 0.03]}><cylinderGeometry args={[0.012, 0.012, 11.5, 4]} /><meshBasicMaterial color="#ddd" /></mesh>
          </group>
        ))}
      </group>
      {/* recovery ship on the horizon */}
      <group position={[420, 0, -300]}>
        <mesh position={[0, 6, 0]} material={MAT.hullDark}><boxGeometry args={[120, 12, 22]} /></mesh>
        <mesh position={[30, 18, 0]} material={MAT.hull}><boxGeometry args={[24, 12, 14]} /></mesh>
      </group>
    </group>
  );
}

export function IntroScene({ timeRef, reducedMotion, onReady }: Props) {
  const { camera, scene } = useThree();
  const craft = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Sprite>(null);
  const vent = useRef<THREE.Points>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const trail = useRef<THREE.Line>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const ready = useRef(0);
  const lastScene = useRef<BeatScene | null>(null);
  const glow = useMemo(() => glowSprite(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmp2 = useMemo(() => new THREE.Vector3(), []);
  const lineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(TRAJECTORY.getPoints(160)), []);
  const trailLine = useMemo(() => new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#59d6ff', transparent: true, opacity: 0.45 })), [lineGeo]);
  const poweredRef = useRef(true);
  const litRef = useRef(false);

  const ventGeo = useMemo(() => {
    const n = 220;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const dirs: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 0.9, s = 0.6 + Math.random() * 2.4;
      dirs.push(Math.cos(a) * Math.cos(e) * s * 0.4, Math.sin(e) * s + 0.4, Math.sin(a) * Math.cos(e) * s);
    }
    g.userData.dirs = dirs;
    return g;
  }, []);
  useEffect(() => () => { ventGeo.dispose(); lineGeo.dispose(); }, [ventGeo, lineGeo]);

  useFrame((state) => {
    const t = timeRef.current;
    const idx = beatAt(t);
    const beat = APOLLO13_BEATS[idx];
    const span = sceneSpan(idx);
    const u = clamp01((t - span.start) / span.dur);
    const local = clamp01((t - beat.start) / beat.duration);
    const clock = state.clock.elapsedTime;

    // ---- craft placement ----
    let cp = tmp.set(0, 0, 0);
    if (beat.scene === 'moon') cp = TRAJECTORY.getPoint(0.3 + u * 0.32, tmp);
    else if (beat.scene === 'legacy') cp = TRAJECTORY.getPoint(0.72 + u * 0.18, tmp);
    else if (['story1', 'story2', 'story3'].includes(beat.scene)) cp = tmp.set(0, -500, 0);
    else cp = tmp.set(t * 0.5, Math.sin(t * 0.2) * 0.4, 0);
    if (craft.current) {
      craft.current.position.copy(cp);
      craft.current.visible = !['splash', 'story1', 'story2', 'story3'].includes(beat.scene);
      // point along the direction of travel
      const ahead = tmp2.copy(cp);
      if (beat.scene === 'moon') TRAJECTORY.getPoint(0.3 + u * 0.32 + 0.01, ahead);
      else if (beat.scene === 'legacy') TRAJECTORY.getPoint(0.72 + u * 0.18 + 0.01, ahead);
      else ahead.set(cp.x + 1, cp.y, cp.z);
      craft.current.lookAt(ahead.x, ahead.y, ahead.z); // +z faces ahead; correct to +x below
      craft.current.rotateY(-Math.PI / 2);
    }
    if (roll.current) roll.current.rotation.x = t * 0.14;
    poweredRef.current = t < BANG_TIME;
    litRef.current = t >= BANG_TIME + 6 && beat.scene !== 'launch';

    // ---- camera ----
    const c = cp;
    switch (beat.scene) {
      case 'launch': {
        const a = -0.9 + u * 0.9;
        pos.set(c.x + Math.sin(a) * 13 - 6, c.y + 3.6 - u * 1.4, c.z + Math.cos(a) * 13);
        look.set(c.x + 2, c.y, c.z);
        break;
      }
      case 'cruise':
        pos.set(c.x + 4 - u * 4, c.y + 2, c.z + 12 - u * 2);
        look.set(c.x + 3, c.y, c.z);
        break;
      case 'incident':
        pos.set(c.x - 4.5 + u * 1.5, c.y + 2.4, c.z + 8.5 - u * 1.2);
        look.set(c.x - 0.6, c.y, c.z);
        break;
      case 'tank':
        pos.set(c.x - 3.2 + u * 1.2, c.y + 1.1, c.z + 4.6 - u * 0.6);
        look.set(c.x - 0.8, c.y + 0.2, c.z + 0.5);
        break;
      case 'lifeboat':
      case 'cold':
      case 'fix':
        pos.set(c.x + 9 - u * 1.5, c.y + 3.2 - u * 1.2, c.z + 6.5);
        look.set(c.x + 4.2, c.y, c.z);
        break;
      case 'moon':
        pos.set(c.x - 24 + u * 8, c.y + 12, c.z + 32 - u * 6);
        look.copy(MOON).lerp(c, 0.45);
        break;
      case 'legacy': {
        const k = ease(u);
        pos.set(40 - k * 60, 70 - k * 20, 260 - k * 20);
        look.set(40, -5, -40);
        break;
      }
      case 'splash': {
        const k = clamp01((t - span.start) / span.dur);
        const capY = 70 - ease(clamp01(k / 0.92)) * 66;
        pos.set(SPLASH.x - 46 + k * 10, 9 + (1 - k) * 14, SPLASH.z + 52);
        look.set(SPLASH.x, Math.max(3, capY * 0.45), 0);
        break;
      }
      default: {
        // story: slow orbit around the Moon with Orion and Earth beyond
        const a = 0.6 + (t - span.start) * 0.05 + (beat.scene === 'story2' ? 0.3 : beat.scene === 'story3' ? 0.6 : 0);
        pos.set(MOON.x + Math.cos(a) * 66, MOON.y + 13, MOON.z + Math.sin(a) * 66);
        look.copy(MOON).add(tmp2.set(0, 3, 0));
      }
    }
    // shake right after the bang
    const since = t - BANG_TIME;
    if (!reducedMotion && since > 0 && since < 1.8) {
      const amp = (1 - since / 1.8) * 0.35;
      pos.x += (Math.random() - 0.5) * amp; pos.y += (Math.random() - 0.5) * amp; pos.z += (Math.random() - 0.5) * amp;
    }
    camera.position.copy(pos);
    camera.lookAt(look);

    // ---- environment per scene ----
    const splash = beat.scene === 'splash';
    if (lastScene.current !== beat.scene) {
      lastScene.current = beat.scene;
      scene.background = new THREE.Color(splash ? '#8fc4ee' : '#000004');
      scene.fog = splash ? new THREE.Fog('#a6d0f0', 500, 5200) : null;
    }
    if (trail.current) trail.current.visible = beat.scene === 'moon' || beat.scene === 'legacy';
    if (amb.current) amb.current.intensity = splash ? 1.2 : 0.22;
    if (sun.current) sun.current.intensity = splash ? 2.6 : 3.4;

    // ---- flash and gas venting ----
    if (flash.current) {
      const f = since > 0 && since < 1.6 ? Math.exp(-since * 3.2) : 0;
      flash.current.visible = f > 0.01;
      flash.current.scale.setScalar(2 + f * 26);
      (flash.current.material as THREE.SpriteMaterial).opacity = f;
      flash.current.position.set(cp.x - 1.2, cp.y + 0.6, cp.z + 0.9);
    }
    if (vent.current) {
      const show = since > 0 && ['incident', 'tank', 'lifeboat', 'cold', 'fix'].includes(beat.scene);
      vent.current.visible = show;
      if (show) {
        const arr = (vent.current.geometry.attributes.position as THREE.BufferAttribute);
        const dirs = vent.current.geometry.userData.dirs as number[];
        const age = since;
        for (let i = 0; i < arr.count; i++) {
          const k = 1 - Math.exp(-age * 0.35);
          arr.setXYZ(i, dirs[i * 3] * k * 10, dirs[i * 3 + 1] * k * 7, dirs[i * 3 + 2] * k * 10);
        }
        arr.needsUpdate = true;
        vent.current.position.set(cp.x - 1.2, cp.y + 0.3, cp.z + 0.9);
        (vent.current.material as THREE.PointsMaterial).opacity = Math.max(0.12, 0.7 - age * 0.01);
      }
    }
    void clock;
    void local;
    if (ready.current < 4 && ++ready.current === 4) onReady();
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.22} />
      <directionalLight ref={sun} position={[300, 120, 200]} intensity={3.4} color="#fff6e6" />
      <Starfield count={2200} radius={3000} size={2} />
      <Planet kind="earth" radius={70} position={[EARTH.x, EARTH.y, EARTH.z]} rotationSpeed={0.006} />
      <Planet kind="moon" radius={24} position={[MOON.x, MOON.y, MOON.z]} rotationSpeed={0.004} atmosphere={false} />

      {/* free-return trajectory (a hint of the path the ship took) */}
      <primitive object={trailLine} ref={trail} />

      <group ref={craft}>
        <group ref={roll}>
          <Odyssey powered={poweredRef.current} />
          <Aquarius lit={litRef.current} />
        </group>
      </group>

      <sprite ref={flash} visible={false}>
        <spriteMaterial map={glow} color="#fff3d0" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <points ref={vent} geometry={ventGeo} visible={false} frustumCulled={false}>
        <pointsMaterial map={glow} color="#e8f0ff" size={0.8} transparent opacity={0.45} depthWrite={false} sizeAttenuation />
      </points>

      <Splashdown timeRef={timeRef} />
      <group position={[MOON.x + 44, MOON.y + 6, MOON.z + 18]} rotation={[0, 1.2, 0]}><Orion scale={0.8} /></group>
    </>
  );
}
