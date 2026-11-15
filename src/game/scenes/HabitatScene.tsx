import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Destination } from '../../types';
import type { SceneApi } from '../api';
import { FirstPersonRig, newPlayer, type PlayerState } from '../FirstPersonRig';
import { HABITAT_COLLIDERS, HABITAT_HALF, HABITAT_STATIONS, getWorld } from '../terrain';
import { MAT, Planet, Starfield } from '../props';
import { LiveScreen, StatusLight } from '../widgets';
import type { Interactable } from '../runtime';
import { audio } from '../audio';
import { isSolarStorm } from '../../engine/field';
import { nextObjective } from '../../engine/objectives';

interface Props { destination: Destination; api: SceneApi; paused: boolean }

const W = { x: HABITAT_HALF.x, z: HABITAT_HALF.z, h: 3.5 };

const wallMat = new THREE.MeshStandardMaterial({ color: '#c9d0da', roughness: 0.6, metalness: 0.3 });
const floorMat = new THREE.MeshStandardMaterial({ color: '#6a7688', roughness: 0.6, metalness: 0.35 });
const ceilMat = new THREE.MeshStandardMaterial({ color: '#aab2bf', roughness: 0.7, metalness: 0.2 });
const trim = new THREE.MeshStandardMaterial({ color: '#4b5565', roughness: 0.5, metalness: 0.7 });

type V3 = [number, number, number];
function Box({ p, s, m = wallMat, shadow = false }: { p: V3; s: V3; m?: THREE.Material; shadow?: boolean }) {
  return <mesh position={p} material={m} castShadow={shadow} receiveShadow={shadow}><boxGeometry args={s} /></mesh>;
}
function Glow({ p, s, color }: { p: V3; s: V3; color: string }) {
  return <mesh position={p}><boxGeometry args={s} /><meshBasicMaterial color={color} /></mesh>;
}

function Plants({ api }: { api: SceneApi }) {
  const group = useRef<THREE.Group>(null);
  const acc = useRef(0);
  const items = useMemo(() => {
    const out: { x: number; y: number; z: number; r: number }[] = [];
    for (let tier = 0; tier < 3; tier++) for (let i = 0; i < 7; i++) out.push({ x: -13.5, y: 0.7 + tier * 0.85, z: -2.8 + i * 0.93, r: 0.7 + ((i * 37 + tier * 11) % 10) / 25 });
    return out;
  }, []);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.5 || !group.current) return;
    acc.current = 0;
    const g = api.getField().cropGrowth / 100;
    group.current.children.forEach((c, i) => {
      const it = items[i];
      const s = 0.25 + g * 0.75 * it.r;
      c.scale.set(s, s, s);
      c.position.y = it.y + 0.12 + s * 0.22;
      ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(g >= 1 ? '#8be04a' : '#3ea84a');
    });
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y + 0.3, it.z]}>
          <icosahedronGeometry args={[0.4, 1]} />
          <meshStandardMaterial color="#3ea84a" roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Spinner({ destination }: { destination: Destination }) {
  return (
    <group position={[0, 1.7, 0]}>
      <Planet kind={destination} radius={0.4} position={[0, 0, 0]} rotationSpeed={0.4} atmosphere={false} />
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.008, 6, 48]} /><meshBasicMaterial color="#59d6ff" /></mesh>
    </group>
  );
}

export function HabitatScene({ destination, api, paused }: Props) {
  const world = getWorld(destination);
  const player = useRef<PlayerState>(newPlayer(12.4, 0.4, Math.PI / 2));
  const { scene, gl } = useThree();
  const ready = useRef(0);
  const storm = isSolarStorm(destination, api.getSim().currentSol);
  const alarm = useRef<THREE.PointLight>(null);

  useEffect(() => {
    scene.background = new THREE.Color('#04070d');
    scene.fog = null;
    gl.toneMappingExposure = 1.1;
    audio.ambience('habitat');
    audio.sfx('door');
    const sim = api.getSim();
    const f = api.getField();
    if (f.suitO2 < 45 || f.suitPower < 30) api.say('Your suit is low. Hold E at the suit rack to refill it before going outside.');
    else if (isSolarStorm(destination, sim.currentSol)) api.say('Solar storm alert! The shelter alcove is shielded. Stay inside until it passes.');
    return () => { audio.ambience('none'); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  useEffect(() => {
    if (api.recoveryNonce === 0) return;
    const p = player.current; p.x = 12.4; p.z = 0.4; p.yaw = Math.PI / 2; p.vx = p.vz = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.recoveryNonce]);

  useFrame((s) => {
    if (alarm.current) alarm.current.intensity = storm ? 4 + Math.sin(s.clock.elapsedTime * 6) * 4 : 0;
    if (ready.current < 4 && ++ready.current === 4) api.sceneReady();
  });

  const interactables = useMemo<Interactable[]>(() => {
    const st = (id: string) => HABITAT_STATIONS.find((s) => s.id === id)!;
    const mk = (id: string, prompt: string | (() => string), onInteract: () => void, label: string, extra: Partial<Interactable> = {}): Interactable => {
      const s = st(id);
      return { id, x: s.x, z: s.z, radius: s.radius, prompt, onInteract, marker: { label, kind: 'objective' }, ...extra };
    };
    const sim = () => api.getSim();
    return [
      mk('airlock', 'Go outside through the airlock', () => api.enterSurface(), 'Airlock', { marker: { label: 'Airlock', kind: 'door' } }),
      mk('suitrack', () => `Hold E: refill your suit (uses habitat oxygen and power)`, () => api.refillSuit(), 'Suit rack', { hold: 1.5 }),
      mk('oxygen', 'Inspect the oxygen generator', () => { api.inspectSystem('oxygen'); api.openPanel('oxygen'); }, 'Oxygen'),
      mk('water', 'Inspect the water recycler', () => { api.inspectSystem('water'); api.openPanel('water'); }, 'Water'),
      mk('power', 'Inspect the power and batteries', () => { api.inspectSystem('power'); api.openPanel('power'); }, 'Power'),
      mk('hydroponics', 'Inspect the hydroponics garden', () => { api.inspectSystem('food'); api.openPanel('food'); }, 'Food garden'),
      mk('shelter', 'Inspect the radiation shelter', () => { api.inspectSystem('radiation'); api.openPanel('radiation'); }, 'Shelter'),
      mk('bunk', () => `Sleep to start Sol ${Math.min(sim().currentSol + 1, sim().totalSols)}`, () => api.sleep(), 'Crew bunk',
        { enabled: () => sim().missionStatus === 'active' && sim().currentSol < sim().totalSols }),
      mk('console', 'Use the mission console', () => api.openPanel('console'), 'Console'),
      mk('comms', 'Radio Mission Control (return to Command Centre)', () => api.goCommand(), 'Comms'),
    ];
  }, [api]);

  const colorOf = (id: string) => ({ oxygen: '#4aa8ff', water: '#3ad6d0', power: '#ffb84a', food: '#5adf6a', radiation: '#b36bff' } as Record<string, string>)[id] ?? '#59d6ff';
  const sim = () => api.getSim();
  const hint = () => nextObjective({ destination, sim: sim(), field: api.getField(), completedSites: api.getCompletedSites() })?.title ?? 'All objectives complete';

  return (
    <>
      <ambientLight intensity={1.0} />
      <hemisphereLight args={['#eef4ff', '#5a6578', 1.0]} />
      {[-11, -3.5, 4, 11.5].map((x) => <pointLight key={x} position={[x, 3.1, 0]} intensity={14} distance={14} color="#eaf3ff" decay={1.6} />)}
      <pointLight ref={alarm} position={[0, 3, 0]} color="#ff3a2a" intensity={0} distance={20} />
      <Starfield count={400} radius={200} size={1.6} />

      {/* shell */}
      <Box p={[0, -0.05, 0]} s={[W.x * 2, 0.1, W.z * 2]} m={floorMat} shadow />
      <Box p={[0, W.h + 0.05, 0]} s={[W.x * 2, 0.1, W.z * 2]} m={ceilMat} />
      <Box p={[0, W.h / 2, -W.z - 0.1]} s={[W.x * 2 + 0.4, W.h, 0.2]} />
      <Box p={[0, W.h / 2, W.z + 0.1]} s={[W.x * 2 + 0.4, W.h, 0.2]} />
      <Box p={[-W.x - 0.1, W.h / 2, 0]} s={[0.2, W.h, W.z * 2]} />
      <Box p={[W.x + 0.1, W.h / 2, 0]} s={[0.2, W.h, W.z * 2]} />
      {/* wall rails, floor guide lights, ceiling light strips */}
      <Box p={[0, 1.1, -W.z + 0.02]} s={[W.x * 2, 0.08, 0.06]} m={trim} />
      <Box p={[0, 1.1, W.z - 0.02]} s={[W.x * 2, 0.08, 0.06]} m={trim} />
      <Glow p={[0, 0.01, 0]} s={[W.x * 2 - 3, 0.02, 0.1]} color="#2b8fff" />
      {[-11, -3.5, 4, 11.5].map((x) => <Glow key={x} p={[x, W.h - 0.04, 0]} s={[3.2, 0.05, 0.5]} color="#f4faff" />)}
      {/* ribs */}
      {Array.from({ length: 9 }).map((_, i) => (
        <group key={i}>
          <Box p={[-W.x + 2 + i * 3.7, W.h / 2, -W.z + 0.05]} s={[0.16, W.h, 0.12]} m={trim} />
          <Box p={[-W.x + 2 + i * 3.7, W.h / 2, W.z - 0.05]} s={[0.16, W.h, 0.12]} m={trim} />
        </group>
      ))}
      {/* portholes on the south wall */}
      {[-9, -2, 5].map((x) => (
        <group key={x} position={[x + 3.2, 2.2, W.z - 0.08]}>
          <mesh rotation={[0, Math.PI, 0]}><circleGeometry args={[0.45, 24]} /><meshBasicMaterial color={destination === 'moon' ? '#05060a' : '#c98e66'} /></mesh>
          <mesh><torusGeometry args={[0.47, 0.05, 8, 24]} /><meshStandardMaterial color="#586072" metalness={0.8} roughness={0.4} /></mesh>
        </group>
      ))}

      {/* holo table */}
      <mesh position={[0, 0.45, 0]} material={trim} castShadow><cylinderGeometry args={[1.2, 1.3, 0.9, 24]} /></mesh>
      <mesh position={[0, 0.92, 0]}><cylinderGeometry args={[1.25, 1.25, 0.04, 32]} /><meshBasicMaterial color="#59d6ff" transparent opacity={0.4} /></mesh>
      <Spinner destination={destination} />

      {/* hydroponics (west wall) */}
      <group>
        <Box p={[-14.9, 1.6, 0]} s={[0.3, 3.2, 7.4]} m={trim} />
        {[0, 1, 2].map((t) => (
          <group key={t}>
            <Box p={[-14, 0.55 + t * 0.85, 0]} s={[1.3, 0.12, 7.2]} m={trim} />
            <Glow p={[-13.9, 1.05 + t * 0.85, 0]} s={[1.0, 0.05, 6.9]} color="#d26bff" />
          </group>
        ))}
        <pointLight position={[-13, 2, 0]} color="#c76bff" intensity={10} distance={9} />
        <Plants api={api} />
        <StatusLight p={[-12.8, 3, 0]} level={() => 100 - Math.abs(50 - api.getField().cropGrowth)} />
      </group>

      {/* oxygen generator */}
      <group position={[-7, 0, 6.1]}>
        <Box p={[0, 1.2, 0]} s={[3.4, 2.4, 1.2]} m={trim} shadow />
        {[-1, 0, 1].map((i) => <mesh key={i} position={[i * 1.0, 1.2, -0.7]} material={MAT.hull} castShadow><cylinderGeometry args={[0.38, 0.38, 2.2, 16]} /></mesh>)}
        <Glow p={[0, 2.35, -0.62]} s={[3.2, 0.06, 0.04]} color={colorOf('oxygen')} />
        <StatusLight p={[0, 2.7, -0.4]} level={() => sim().oxygenLevel} />
      </group>
      {/* water recycler */}
      <group position={[-0.5, 0, 6.1]}>
        <Box p={[0, 1.2, 0]} s={[3.4, 2.4, 1.2]} m={trim} shadow />
        {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 1.2, -0.7]}><cylinderGeometry args={[0.55, 0.55, 2.0, 18]} /><meshStandardMaterial color="#6fe0e6" transparent opacity={0.55} roughness={0.15} emissive="#1a8a90" emissiveIntensity={0.5} /></mesh>)}
        <Glow p={[0, 2.35, -0.62]} s={[3.2, 0.06, 0.04]} color={colorOf('water')} />
        <StatusLight p={[0, 2.7, -0.4]} level={() => sim().waterLevel} />
      </group>
      {/* power bank */}
      <group position={[6.5, 0, 6.1]}>
        <Box p={[0, 1.2, 0]} s={[3.4, 2.4, 1.2]} m={trim} shadow />
        {[-1.2, -0.4, 0.4, 1.2].map((x) => <Box key={x} p={[x, 1.2, -0.65]} s={[0.6, 1.9, 0.1]} m={MAT.hullDark} />)}
        {[-1.2, -0.4, 0.4, 1.2].map((x) => <Glow key={x} p={[x, 1.9, -0.72]} s={[0.4, 0.08, 0.02]} color={colorOf('power')} />)}
        <StatusLight p={[0, 2.7, -0.4]} level={() => sim().batteryCharge} />
      </group>
      {/* bunk */}
      <group position={[-7, 0, -6]}>
        <Box p={[0, 0.5, 0]} s={[3, 0.5, 1.7]} m={trim} shadow />
        <Box p={[0, 0.85, 0]} s={[2.8, 0.25, 1.5]} m={new THREE.MeshStandardMaterial({ color: '#3b5b8c', roughness: 0.9 })} />
        <Box p={[-1.0, 1.05, 0]} s={[0.7, 0.18, 1.1]} m={new THREE.MeshStandardMaterial({ color: '#e8eef8', roughness: 0.9 })} />
        <Box p={[0, 2.3, -0.8]} s={[3, 0.1, 0.1]} m={trim} />
      </group>
      {/* console + comms */}
      <group position={[0, 0, -6.2]}>
        <Box p={[0, 0.55, 0]} s={[3.6, 1.1, 1.3]} m={trim} shadow />
        <LiveScreen p={[0, 1.9, 0.5]} size={[3.2, 1.2]} accent="#59d6ff" lines={() => [
          `SOL ${sim().currentSol} / ${sim().totalSols}`,
          `O2 ${Math.round(sim().oxygenLevel)}%  H2O ${Math.round(sim().waterLevel)}%`,
          `PWR ${Math.round(sim().batteryCharge)}%  FOOD ${Math.round(api.getField().foodLevel)}%`,
          `NEXT: ${hint().slice(0, 26)}`,
        ]} />
      </group>
      <group position={[7, 0, -6.2]}>
        <Box p={[0, 0.55, 0]} s={[3.2, 1.1, 1.3]} m={trim} shadow />
        <LiveScreen p={[0, 1.7, 0.5]} size={[2.4, 1.0]} accent="#7dffc0" lines={() => ['MISSION CONTROL', 'LINK: STABLE', 'DELAY: ' + (destination === 'mars' ? '~12 MIN' : '1.3 SEC')]} />
      </group>
      {/* radiation shelter */}
      <group position={[13.6, 0, -5.4]}>
        <Box p={[0, 1.4, 0]} s={[3.2, 2.8, 2]} m={trim} />
        <mesh position={[0, 1.4, 1.02]}><boxGeometry args={[2.6, 2.4, 0.04]} /><meshStandardMaterial color="#6a8cff" transparent opacity={0.45} emissive="#4a2fd0" emissiveIntensity={0.7} /></mesh>
        <StatusLight p={[0, 3.0, 1.1]} level={() => 100 - api.getField().radiationDose} />
      </group>
      {/* suit rack */}
      <group position={[14.8, 0, 4.4]}>
        <Box p={[0, 1.3, 0]} s={[0.4, 2.6, 2.2]} m={trim} />
        {[-0.6, 0.6].map((z) => (
          <group key={z} position={[-0.55, 1.35, z]}>
            <mesh material={MAT.hull} castShadow><capsuleGeometry args={[0.28, 0.9, 4, 12]} /></mesh>
            <mesh position={[0, 0.78, 0]} material={MAT.hull}><sphereGeometry args={[0.3, 16, 12]} /></mesh>
            <mesh position={[-0.12, 0.78, 0]}><sphereGeometry args={[0.2, 12, 10, 0, 6.3, 0, 1.6]} /><meshStandardMaterial color="#e0b24a" metalness={0.9} roughness={0.2} /></mesh>
          </group>
        ))}
        <StatusLight p={[-0.3, 2.7, 0]} level={() => Math.min(api.getField().suitO2, api.getField().suitPower)} />
      </group>
      {/* airlock door (east wall) */}
      <group position={[15.85, 0, 0]}>
        <Box p={[0, 1.4, 0]} s={[0.2, 2.8, 2.6]} m={trim} />
        <mesh position={[-0.12, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[1.0, 28]} /><meshBasicMaterial color="#0c1a2a" /></mesh>
        <mesh position={[-0.13, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[1.02, 0.07, 8, 32]} /><meshBasicMaterial color={storm ? '#ff5a4a' : '#44ff99'} /></mesh>
      </group>
      <group position={[0, 0, 0]}>{null}</group>
      <FirstPersonRig
        player={player} ground={() => 0} colliders={() => HABITAT_COLLIDERS}
        bounds={{ minX: -W.x + 0.9, maxX: W.x - 0.9, minZ: -W.z + 0.9, maxZ: W.z - 0.9 }}
        gravity={world.gravity} eye={1.7} walk={3.6} sprint={6.2} jump={0.5}
        interactables={() => interactables} mode={paused ? 'frozen' : 'walk'} reducedMotion={api.reducedMotion} footsteps resetKey={`hab-${destination}`}
      />
    </>
  );
}
