import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Destination } from '../../types';
import type { SceneApi } from '../api';
import { FirstPersonRig, newPlayer, type PlayerState } from '../FirstPersonRig';
import { MAT, Planet, Starfield } from '../props';
import { AstronautFigure, LiveScreen, NovaBot } from '../widgets';
import type { Collider } from '../terrain';
import type { Interactable } from '../runtime';
import { audio } from '../audio';
import { objectiveProgress } from '../../engine/objectives';
import { rankFor } from '../../engine/objectives';

interface Props {
  destination: Destination;
  api: SceneApi;
  paused: boolean;
  xp: number;
  moonDone: boolean;
  marsDone: boolean;
  callSign: string;
}

const R = 15;
const floor = new THREE.MeshStandardMaterial({ color: '#1c2635', roughness: 0.4, metalness: 0.6 });
const wall = new THREE.MeshStandardMaterial({ color: '#1b2430', roughness: 0.6, metalness: 0.5 });
const trim = new THREE.MeshStandardMaterial({ color: '#3a4558', roughness: 0.5, metalness: 0.7 });
const ringColliders: Collider[] = Array.from({ length: 32 }).map((_, i) => {
  const a = (i / 32) * Math.PI * 2;
  return { x: Math.sin(a) * (R + 1.2), z: Math.cos(a) * (R + 1.2), r: 2.2 };
});
const centerCollider: Collider[] = [{ x: 0, z: 0, r: 3.9 }];

function Console({ x, z, label, color, rotY, children }: { x: number; z: number; label: string; color: string; rotY: number; children?: React.ReactNode }) {
  void label;
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.55, 0]} material={trim} castShadow receiveShadow><boxGeometry args={[3, 1.1, 1.2]} /></mesh>
      <mesh position={[0, 1.15, 0.1]} rotation={[-0.5, 0, 0]} material={wall}><boxGeometry args={[2.8, 0.1, 0.9]} /></mesh>
      <mesh position={[0, 1.2, 0.28]} rotation={[-0.5, 0, 0]}><planeGeometry args={[2.5, 0.6]} /><meshBasicMaterial color={color} transparent opacity={0.8} /></mesh>
      {children}
    </group>
  );
}

export function CommandScene({ destination, api, paused, xp, moonDone, marsDone, callSign }: Props) {
  const player = useRef<PlayerState>(newPlayer(0, 10, 0));
  const { scene, gl } = useThree();
  const globe = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const ready = useRef(0);

  useEffect(() => {
    scene.background = new THREE.Color('#03060c');
    scene.fog = new THREE.Fog('#050b16', 40, 110);
    gl.toneMappingExposure = 1.15;
    audio.ambience('command');
    return () => { scene.fog = null; audio.ambience('none'); };
  }, [scene, gl]);

  useFrame((s, dt) => {
    if (globe.current) globe.current.rotation.y += dt * 0.12;
    if (orbit.current) orbit.current.rotation.y += dt * 0.4;
    if (ready.current < 4 && ++ready.current === 4) api.sceneReady();
    void s;
  });

  const interactables = useMemo<Interactable[]>(() => {
    const mk = (id: string, x: number, z: number, prompt: string, panel: Parameters<SceneApi['openPanel']>[0], label: string, radius = 3.2): Interactable => ({
      id, x, z, radius, prompt, onInteract: () => api.openPanel(panel), marker: { label, kind: 'objective' },
    });
    return [
      mk('nav', 0, 4.4, 'Open mission selection', 'navigation', 'Mission table', 3.6),
      mk('objectives', -10.6, -6, 'Read the mission objectives', 'objectives', 'Objectives'),
      mk('status', 10.6, -6, 'Check astronaut status', 'status', 'Astronaut status'),
      mk('journal', -10.6, 6.5, 'Open the mission journal', 'journal', 'Journal'),
      mk('achievements', 10.6, 6.5, 'View your achievements', 'achievements', 'Achievements'),
      mk('apollo', 0, -11.2, 'Replay the Apollo 13 story', 'replay', 'Apollo 13'),
      mk('nova', 3.6, 6.2, 'Talk to NOVA', 'nova', 'NOVA', 2.8),
    ];
  }, [api]);

  const prog = () => objectiveProgress({ destination, sim: api.getSim(), field: api.getField(), completedSites: api.getCompletedSites() });
  const rank = rankFor(xp);

  return (
    <>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#bcd4ff', '#243044', 1.1]} />
      {[[-9, 6], [9, -6]].map(([x, z]) => <pointLight key={`${x}${z}`} position={[x, 5.5, z]} intensity={30} distance={26} color="#bcd8ff" decay={1.5} />)}
      <pointLight position={[0, 3.4, 0]} intensity={40} distance={14} color="#59d6ff" decay={1.6} />
      <Starfield count={500} radius={120} size={1.5} />

      {/* floor, dome and wall ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow><circleGeometry args={[R + 4, 64]} /></mesh>
      {[4.2, 8, 11.5, 14.2].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[r, r + 0.07, 96]} /><meshBasicMaterial color="#2b8fff" transparent opacity={0.55} /></mesh>
      ))}
      <mesh position={[0, 4.5, 0]}><cylinderGeometry args={[R + 3.9, R + 3.9, 9, 64, 1, true]} /><meshStandardMaterial color="#2a3a52" side={THREE.BackSide} roughness={0.7} metalness={0.3} /></mesh>
      <mesh position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[R + 4, 64]} /><meshStandardMaterial color="#0d131b" side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <mesh key={i} position={[Math.sin(a) * (R + 3.8), 4.5, Math.cos(a) * (R + 3.8)]} rotation={[0, a, 0]} material={trim}><boxGeometry args={[0.5, 9, 0.5]} /></mesh>;
      })}
      {[2, 5, 8].map((y) => <mesh key={y} position={[0, y + 1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R + 3.6 - y * 0.2, 0.06, 6, 96]} /><meshBasicMaterial color="#4ab8ff" /></mesh>)}

      {/* big window wall behind the Apollo exhibit: a slice of space */}
      <mesh position={[0, 4.6, -R - 3.2]} rotation={[0, 0, 0]}><planeGeometry args={[16, 5]} /><meshBasicMaterial color="#02040a" /></mesh>

      {/* wall screens */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = Math.PI * 0.62 + (i / 6) * Math.PI * 0.76 + Math.PI;
        const px = Math.sin(a) * (R + 2.7);
        const pz = Math.cos(a) * (R + 2.7);
        const rot = Math.atan2(-px, -pz);
        const sc = [
          () => ['TRAIN FOR ARTEMIS', `Objectives ${prog().done}/${prog().total}`, `Sol ${api.getSim().currentSol}/${api.getSim().totalSols}`],
          () => ['LIFE SUPPORT', `O2 ${Math.round(api.getSim().oxygenLevel)}%`, `Water ${Math.round(api.getSim().waterLevel)}%`],
          () => ['POWER GRID', `Battery ${Math.round(api.getSim().batteryCharge)}%`, `Solar ${api.getSim().totalPowerGeneratedKw} kW`],
          () => ['CREW', `Health ${Math.round(api.getField().crewHealth)}%`, `Food ${Math.round(api.getField().foodLevel)}%`],
          () => ['ROVER', `Battery ${Math.round(api.getField().rover.battery)}%`, `Hull ${Math.round(api.getField().rover.integrity)}%`],
          () => ['RADIATION', `Dose ${Math.round(api.getField().radiationDose)}%`, 'Shelter: ready'],
          () => ['COMMS', 'Houston: link stable', 'NOVA: online'],
        ][i];
        return <LiveScreen key={i} p={[px, 4, pz]} rot={[0, rot, 0]} size={[4.4, 2.4]} lines={sc} accent={i % 2 ? '#59d6ff' : '#7dffc0'} />;
      })}

      {/* central hologram table */}
      <group>
        <mesh position={[0, 0.3, 0]} material={trim} castShadow receiveShadow><cylinderGeometry args={[3.6, 3.9, 0.6, 48]} /></mesh>
        <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[3.4, 3.4, 0.08, 48]} /><meshBasicMaterial color="#59d6ff" transparent opacity={0.35} /></mesh>
        <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.0, 3.15, 64]} /><meshBasicMaterial color="#9ae7ff" /></mesh>
        <group ref={globe} position={[0, 2.5, 0]}>
          <Planet kind="earth" radius={1.35} position={[0, 0, 0]} rotationSpeed={0.15} />
          <mesh><sphereGeometry args={[1.75, 24, 16]} /><meshBasicMaterial color="#59d6ff" wireframe transparent opacity={0.16} /></mesh>
        </group>
        <group ref={orbit} position={[0, 2.5, 0]}>
          <Planet kind="moon" radius={0.32} position={[2.4, 0.2, 0]} rotationSpeed={0.2} atmosphere={false} />
          <Planet kind="mars" radius={0.26} position={[-2.5, -0.3, 0.6]} rotationSpeed={0.2} atmosphere={false} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.38, 2.4, 64]} /><meshBasicMaterial color="#59d6ff" transparent opacity={0.4} /></mesh>
        </group>
      </group>

      {/* consoles around the room */}
      <Console x={-10.6} z={-6} label="Objectives" color="#7dffc0" rotY={Math.PI / 2 + 0.5} />
      <Console x={10.6} z={-6} label="Status" color="#59d6ff" rotY={-Math.PI / 2 - 0.5} />
      <Console x={-10.6} z={6.5} label="Journal" color="#ffb84a" rotY={Math.PI / 2 - 0.5} />
      <Console x={10.6} z={6.5} label="Achievements" color="#ffd24a" rotY={-Math.PI / 2 + 0.5} />

      {/* Apollo 13 exhibit: Odyssey + Aquarius scale models on a plinth */}
      <group position={[0, 0, -11.2]}>
        <mesh position={[0, 0.5, 0]} material={trim} castShadow><cylinderGeometry args={[1.8, 2, 1, 24]} /></mesh>
        <group position={[0, 1.7, 0]} rotation={[0, 0.5, 0.15]}>
          <mesh material={MAT.hull} castShadow><coneGeometry args={[0.35, 0.6, 24]} /></mesh>
          <mesh position={[0, -0.7, 0]} material={MAT.hullDark} castShadow><cylinderGeometry args={[0.35, 0.35, 0.9, 24]} /></mesh>
          <mesh position={[0, -1.3, 0]} material={MAT.gold}><coneGeometry args={[0.2, 0.3, 16, 1, true]} /></mesh>
          <mesh position={[0, -1.15, 0]} rotation={[Math.PI, 0, 0]} material={MAT.gold} castShadow><cylinderGeometry args={[0.28, 0.5, 0.6, 8]} /></mesh>
        </group>
      </group>

      {/* crew mate and NOVA */}
      <AstronautFigure position={[-4.6, 0, 5.2]} rotY={0.6} />
      <NovaBot position={[3.6, 0.7, 6.2]} />

      <FirstPersonRig
        player={player} ground={() => 0} colliders={() => [...ringColliders, ...centerCollider]}
        bounds={{ minX: -R - 2, maxX: R + 2, minZ: -R - 2, maxZ: R + 2 }}
        gravity={9.81} eye={1.7} walk={4.2} sprint={7} jump={0.35}
        interactables={() => interactables} mode={paused ? 'frozen' : 'walk'} reducedMotion={api.reducedMotion} footsteps
        resetKey="command"
      />
      {/* tiny placeholder so rank/xp props are used by the status wall */}
      <LiveScreen p={[0, 6.6, -R - 2.5]} size={[5, 1.2]} accent="#ffd24a" lines={() => [`${callSign}: ${rank.title}`, `XP ${xp}  Moon ${moonDone ? 'done' : 'open'}  Mars ${marsDone ? 'done' : marsDone === false && moonDone ? 'ready' : 'locked'}`]} />
    </>
  );
}
