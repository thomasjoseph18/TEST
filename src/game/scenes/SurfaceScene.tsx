import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Destination } from '../../types';
import type { SceneApi } from '../api';
import { FirstPersonRig, newPlayer, type PlayerState } from '../FirstPersonRig';
import {
  Beacon, Boulders, ChargePad, DriftingDust, Flag, HabitatExterior, HeritageMemorial, Lander, MAT, MarsSky, MoonSky,
  RoverModel, SampleStation, SolarArray, SurfaceLights, Terrain, boulderColliders,
} from '../props';
import { baseColliders, clampToWorld, getWorld, inColdShadow, resolveCollisions, terrainHeight, WORLD_HALF, type Collider } from '../terrain';
import { hudStore, input, type Interactable } from '../runtime';
import { audio } from '../audio';
import { isSolarStorm, ROVER } from '../../engine/field';
import { taskForSite } from '../../engine/objectives';
import { EXPLORATION_POINTS } from '../../data/exploration';

interface Props {
  destination: Destination;
  api: SceneApi;
  /** Which way the player enters: from the habitat airlock. */
  paused: boolean;
}

interface RoverRT { x: number; z: number; yaw: number; speed: number; steer: number; y: number; pitch: number; roll: number; }

function DistantRange({ destination }: { destination: Destination }) {
  const geo = useMemo(() => {
    const seg = 96;
    const g = new THREE.CylinderGeometry(1500, 1500, 1, seg, 1, true);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const top = pos.getY(i) > 0;
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      const h = 90 + Math.sin(a * 7) * 40 + Math.sin(a * 17 + 1) * 24 + Math.sin(a * 41) * 8;
      pos.setY(i, top ? h : -30);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const moon = destination === 'moon';
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color={moon ? '#4e4d4a' : '#7a3d23'} side={THREE.BackSide} roughness={1} fog /></mesh>
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1500, 48]} />
        <meshStandardMaterial color={moon ? '#5e5d59' : '#8c4a28'} roughness={1} fog />
      </mesh>
    </group>
  );
}

function SiteProp({ id, x, z, done, destination }: { id: string; x: number; z: number; done: boolean; destination: Destination }) {
  const y = terrainHeight(destination, x, z);
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (spin.current) spin.current.rotation.y += dt * (hudStore.get().focusId === id && hudStore.get().holdProgress > 0 ? 6 : 0.8); });
  const led = done ? '#44ff99' : '#ffb84a';
  if (id === 'moon-apollo-11') return <group position={[0, y, 0]}><HeritageMemorial x={x} z={z} done={done} /></group>;
  return (
    <group position={[x, y, z]}>
      {(id === 'moon-shackleton-rim' || id === 'moon-psr-cold-trap' || id === 'mars-jezero-delta' || id === 'mars-subsurface-glacier') && (
        <group>
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2;
            return <mesh key={i} position={[Math.sin(a) * 0.7, 0.9, Math.cos(a) * 0.7]} rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]} material={MAT.hull} castShadow><cylinderGeometry args={[0.03, 0.04, 1.9, 6]} /></mesh>;
          })}
          <group ref={spin} position={[0, 1.9, 0]}>
            <mesh material={MAT.hullDark} castShadow><boxGeometry args={[0.5, 0.35, 0.5]} /></mesh>
            <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.glass}><cylinderGeometry args={[0.12, 0.12, 0.2, 12]} /></mesh>
          </group>
          <mesh position={[0, 2.2, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshBasicMaterial color={led} /></mesh>
          {id === 'moon-psr-cold-trap' && <mesh position={[0, 0.05, 1.8]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.5, 20]} /><meshStandardMaterial color="#bfe8ff" emissive="#5aa8ff" emissiveIntensity={0.5} roughness={0.2} /></mesh>}
          {id === 'mars-subsurface-glacier' && <mesh position={[0, 0.06, 1.8]}><boxGeometry args={[2, 0.1, 1.2]} /><meshStandardMaterial color="#3a3f4a" /></mesh>}
        </group>
      )}
      {id === 'moon-lunar-rover' && (
        <group>
          <mesh position={[0, 1.6, 0]} material={MAT.hull} castShadow><cylinderGeometry args={[0.06, 0.06, 3.2, 8]} /></mesh>
          <mesh position={[0, 3.3, 0]}><sphereGeometry args={[0.18, 10, 10]} /><meshBasicMaterial color={led} /></mesh>
          <mesh position={[0.8, 0.4, 0.5]} material={MAT.hullDark} castShadow><boxGeometry args={[0.9, 0.8, 0.7]} /></mesh>
          <Flag x={-1.4} z={0.3} />
        </group>
      )}
      {id === 'mars-moxie-station' && (
        <group>
          <mesh position={[0, 0.7, 0]} material={MAT.gold} castShadow><boxGeometry args={[1.6, 1.2, 1.2]} /></mesh>
          <mesh position={[0.5, 1.6, 0]} material={MAT.hull}><cylinderGeometry args={[0.15, 0.15, 0.9, 10]} /></mesh>
          <mesh position={[-0.4, 1.5, 0]} material={MAT.hullDark}><cylinderGeometry args={[0.1, 0.1, 0.7, 10]} /></mesh>
          <mesh position={[0, 1.3, 0.62]}><boxGeometry args={[0.6, 0.25, 0.03]} /><meshBasicMaterial color={led} /></mesh>
        </group>
      )}
      {id === 'mars-dust-storm-basin' && (
        <group>
          <mesh position={[0, 2.2, 0]} material={MAT.hull} castShadow><cylinderGeometry args={[0.05, 0.07, 4.4, 8]} /></mesh>
          <group ref={spin} position={[0, 4.4, 0]}>
            {[0, 1, 2].map((i) => <mesh key={i} position={[Math.sin((i / 3) * 6.283) * 0.5, 0, Math.cos((i / 3) * 6.283) * 0.5]} material={MAT.hull}><sphereGeometry args={[0.14, 8, 6, 0, 3.14]} /></mesh>)}
          </group>
          <mesh position={[0, 4.7, 0]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color={led} /></mesh>
        </group>
      )}
    </group>
  );
}

export function SurfaceScene({ destination, api, paused }: Props) {
  const world = useMemo(() => getWorld(destination), [destination]);
  const ground = useMemo(() => (x: number, z: number) => terrainHeight(destination, x, z), [destination]);
  const player = useRef<PlayerState>(newPlayer(world.spawn.x, world.spawn.z, world.spawn.yaw));
  const rover = useRef<RoverRT>({ x: world.roverPad.x, z: world.roverPad.z, yaw: Math.PI, speed: 0, steer: 0, y: 0, pitch: 0, roll: 0 });
  const [driving, setDriving] = useState(false);
  const drivingRef = useRef(false);
  const roverGroup = useRef<THREE.Group>(null);
  const { camera, scene, gl } = useThree();
  const lowPerf = api.lowPerf;
  const boulderCount = lowPerf ? 350 : 800;
  const rockColliders = useMemo(() => boulderColliders(destination, boulderCount), [destination, boulderCount]);
  const staticColliders = useMemo<Collider[]>(() => [...baseColliders(destination), ...rockColliders], [destination, rockColliders]);
  const [, bump] = useState(0);
  const tickAcc = useRef(0);
  const readyFrames = useRef(0);
  const storm = isSolarStorm(destination, api.getSim().currentSol);

  // fog / background
  useEffect(() => {
    const moon = destination === 'moon';
    scene.background = new THREE.Color(moon ? '#000004' : '#c98e66');
    scene.fog = moon ? null : new THREE.Fog('#cf9a72', 140, 1000);
    gl.toneMappingExposure = moon ? 1.05 : 1.0;
    return () => { scene.fog = null; };
  }, [destination, scene, gl]);

  // arrive: first EVA
  useEffect(() => {
    api.setFlag('eva_started');
    audio.ambience(destination === 'moon' ? 'moon' : 'mars');
    audio.breathing(true);
    return () => { audio.breathing(false); audio.motor(null); audio.ambience('none'); hudStore.set({ driving: false }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  // respawn after a suit emergency
  useEffect(() => {
    if (api.recoveryNonce === 0) return;
    const p = player.current;
    p.x = world.spawn.x; p.z = world.spawn.z; p.yaw = world.spawn.yaw; p.pitch = 0; p.vx = p.vz = p.vy = 0;
    drivingRef.current = false; setDriving(false);
    rover.current.speed = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.recoveryNonce]);

  const colliders = () => {
    const list: Collider[] = staticColliders.slice();
    if (!drivingRef.current) list.push({ x: rover.current.x, z: rover.current.z, r: 2.1 });
    return list;
  };

  // ------- interactables -------
  const interactables = useMemo<Interactable[]>(() => {
    const list: Interactable[] = [];
    const done = (id: string) => api.getCompletedSites().includes(id);
    list.push({
      id: 'airlock', x: world.airlock.x, z: world.airlock.z + 1.2, radius: 4, prompt: 'Enter the habitat',
      onInteract: () => api.enterHabitat(), marker: { label: 'Habitat', kind: 'base' },
    });
    list.push({
      id: 'solar', x: world.solarArray.x, z: world.solarArray.z + 2.4, radius: 5, hold: 2,
      prompt: () => (api.getSim().solarDustAccumulation < 1 ? 'Solar panels are clean' : 'Hold E: wipe dust off the solar panels'),
      onInteract: () => api.cleanSolar(),
      marker: { label: 'Solar array', kind: 'objective' },
    });
    const ss = world.sampleStation;
    const sampled = () => api.getField().samples.some((s) => s === ss.id);
    list.push({
      id: 'sample', x: ss.x, z: ss.z + 1.3, radius: 4.5, hold: 3,
      prompt: () => (sampled() ? 'Sample station is empty' : destination === 'moon' ? 'Hold E: drill a regolith sample' : 'Hold E: drill a Mars rock sample'),
      enabled: () => true,
      onInteract: () => { if (!sampled()) api.collectSample(); },
      marker: { label: 'Sample station', kind: 'objective' },
    });
    const points = EXPLORATION_POINTS.filter((p) => p.destination === destination);
    for (const s of world.sites) {
      const task = taskForSite(s.id);
      const pt = points.find((p) => p.id === s.id);
      if (!task) continue;
      list.push({
        id: `${s.id}:do`, x: s.x, z: s.z, radius: s.radius + 2, hold: task.holdSeconds, prompt: `Hold E: ${task.action}`,
        enabled: () => !done(s.id), onInteract: () => api.startTask(s.id),
        marker: { label: pt?.title.replace(/\s*\(.*\)/, '') ?? s.id, kind: 'site' },
      });
      list.push({
        id: `${s.id}:review`, x: s.x, z: s.z, radius: s.radius + 2, prompt: `Review: ${pt?.title ?? s.id}`,
        enabled: () => done(s.id), onInteract: () => api.openSite(s.id),
      });
    }
    // rover: board
    list.push({
      id: 'rover', x: 0, z: 0, radius: 4.2, prompt: 'Board the rover',
      enabled: () => !drivingRef.current,
      onInteract: () => {
        if (api.getField().rover.battery < 2) { api.toast('The rover battery is empty. Plug it in at the charge pad.', 'warn'); audio.sfx('error'); return; }
        drivingRef.current = true; setDriving(true);
        player.current.yaw = 0; player.current.pitch = 0;
        api.patchField((f) => ({ ...f, flags: { ...f.flags, rover_driven: true } }));
        audio.sfx('door');
        api.say('Rover online! W to drive, A and D to steer, Space to brake. Park and press E to get out.');
      },
      marker: { label: 'Rover', kind: 'rover' },
    });
    // charge pad
    const pad = world.roverPad;
    list.push({
      id: 'charge', x: pad.x + 3.4, z: pad.z - 3.2, radius: 4, hold: 1.2,
      prompt: () => `Hold E: plug the rover into the charger (uses ${Math.max(1, Math.round((100 - api.getField().rover.battery) / 25))}% habitat battery)`,
      enabled: () => !drivingRef.current && api.getField().rover.battery < 97 && Math.hypot(rover.current.x - pad.x, rover.current.z - pad.z) < 7,
      onInteract: () => api.chargeRover(),
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, api]);

  // keep rover interactable glued to the rover's current position
  const interactablesGetter = () => {
    const r = interactables.find((i) => i.id === 'rover');
    if (r) { r.x = rover.current.x; r.z = rover.current.z; }
    return interactables;
  };

  // ------- per-frame logic shared by walking and driving -------
  const frame = (dt: number, p: PlayerState) => {
    // keep the rover mesh synced
    const rg = roverGroup.current;
    const r = rover.current;
    if (rg) {
      if (!drivingRef.current) {
        r.y = ground(r.x, r.z);
        const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw);
        const hf = ground(r.x + fx * 1.8, r.z + fz * 1.8), hb = ground(r.x - fx * 1.8, r.z - fz * 1.8);
        const hl = ground(r.x + fz * 1.3, r.z - fx * 1.3), hr = ground(r.x - fz * 1.3, r.z + fx * 1.3);
        r.pitch = -Math.atan2(hf - hb, 3.6); r.roll = Math.atan2(hl - hr, 2.6);
      }
      rg.position.set(r.x, r.y, r.z);
      rg.rotation.set(r.pitch, r.yaw, r.roll, 'YXZ');
    }
    tickAcc.current += dt;
    if (tickAcc.current >= 0.1) {
      const d = tickAcc.current; tickAcc.current = 0;
      const cold = inColdShadow(destination, drivingRef.current ? r.x : p.x, drivingRef.current ? r.z : p.z);
      api.tick({ dt: d, moving: drivingRef.current ? Math.abs(r.speed) > 0.5 : p.moving, sprinting: p.sprinting, inRover: drivingRef.current, inColdShadow: cold, roverSpeed: drivingRef.current ? r.speed : 0, x: p.x, z: p.z });
      hudStore.set({ inColdShadow: cold });
    }
    if (readyFrames.current < 4 && ++readyFrames.current === 4) api.sceneReady();
    // dust puffs are handled by DriftingDust; nothing else per frame
    void bump;
  };

  // ------- rover driving (runs after the rig, owns camera while driving) -------
  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _look = useMemo(() => new THREE.Quaternion(), []);
  const _e = useMemo(() => new THREE.Euler(), []);
  const _off = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    if (!drivingRef.current) return;
    const dt = Math.min(delta, 0.05);
    const r = rover.current;
    const f = api.getField();
    const canDrive = !input.blocked && !paused;
    const hasPower = f.rover.battery > 0.5;
    let throttle = 0;
    if (canDrive && hasPower) {
      if (input.isDown('KeyW', 'ArrowUp')) throttle += 1;
      if (input.isDown('KeyS', 'ArrowDown')) throttle -= 1;
    }
    const steerIn = canDrive ? (input.isDown('KeyA', 'ArrowLeft') ? 1 : 0) - (input.isDown('KeyD', 'ArrowRight') ? 1 : 0) : 0;
    const brake = canDrive && input.isDown('Space');
    const slope = Math.abs(Math.tan(r.pitch));
    const maxF = ROVER.maxSpeed * (1 - Math.min(0.6, slope * 0.9));
    const target = throttle > 0 ? maxF : throttle < 0 ? -ROVER.reverseSpeed : 0;
    const rate = brake ? 14 : throttle !== 0 ? 5.5 : 2.2;
    r.speed += Math.sign(target - r.speed) * Math.min(Math.abs(target - r.speed), rate * dt);
    r.steer += (steerIn - r.steer) * Math.min(1, dt * 6);
    r.yaw += r.steer * 1.15 * Math.min(1, Math.abs(r.speed) / 3.5) * Math.sign(r.speed || 1) * dt;

    let nx = r.x + Math.sin(r.yaw) * r.speed * dt;
    let nz = r.z + Math.cos(r.yaw) * r.speed * dt;
    nx = clampToWorld(nx); nz = clampToWorld(nz);
    const hit = resolveCollisions(nx, nz, 1.9, staticColliders);
    if (hit.hit) {
      if (Math.abs(r.speed) > 2) { api.roverImpact(r.speed); audio.sfx('thud', 1.2); }
      r.speed *= -0.25;
    }
    r.x = hit.x; r.z = hit.z;
    // follow terrain on four wheel points
    const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw);
    const hc = ground(r.x, r.z);
    const hf = ground(r.x + fx * 1.8, r.z + fz * 1.8), hb = ground(r.x - fx * 1.8, r.z - fz * 1.8);
    const hl = ground(r.x + fz * 1.3, r.z - fx * 1.3), hr = ground(r.x - fz * 1.3, r.z + fx * 1.3);
    const wantPitch = -Math.atan2(hf - hb, 3.6), wantRoll = Math.atan2(hl - hr, 2.6);
    const k = Math.min(1, dt * 8);
    r.pitch += (wantPitch - r.pitch) * k; r.roll += (wantRoll - r.roll) * k;
    r.y += (hc - r.y) * Math.min(1, dt * 12);
    audio.motor(hasPower ? Math.min(1, Math.abs(r.speed) / ROVER.maxSpeed) : 0);

    // camera from the driver's seat
    const rg = roverGroup.current;
    if (rg) {
      rg.position.set(r.x, r.y, r.z);
      rg.rotation.set(r.pitch, r.yaw, r.roll, 'YXZ');
      rg.updateMatrixWorld(true);
      _off.set(-0.5, 1.95, -0.45);
      rg.localToWorld(_off);
      camera.position.copy(_off);
      const pl = player.current;
      pl.yaw = Math.max(-1.9, Math.min(1.9, pl.yaw));
      _look.setFromEuler(_e.set(pl.pitch, Math.PI + pl.yaw, 0, 'YXZ'));
      _q.copy(rg.quaternion).multiply(_look);
      camera.quaternion.copy(_q);
    }

    // exit with E when nearly stopped
    const canExit = Math.abs(r.speed) < 3;
    if (canDrive && input.wasPressed('KeyE')) {
      if (canExit) {
        drivingRef.current = false; setDriving(false); audio.motor(null); audio.sfx('door');
        const pl = player.current;
        pl.x = r.x + Math.cos(r.yaw) * 3.1; pl.z = r.z - Math.sin(r.yaw) * 3.1;
        pl.y = ground(pl.x, pl.z); pl.yaw = r.yaw + Math.PI; pl.pitch = 0; pl.vx = pl.vz = pl.vy = 0;
        r.speed = 0;
      } else api.toast('Slow down before you get out.', 'warn');
    }
    const dist = Math.hypot(r.x - world.roverPad.x, r.z - world.roverPad.z);
    hudStore.set({
      driving: true, speed: Math.abs(r.speed), prompt: hasPower ? (canExit ? 'Press E to get out of the rover' : null) : 'Rover battery empty. Press E to get out',
      focusId: null, holdProgress: 0, markers: hudStore.get().markers,
    });
    // compass in the rover
    {
      const heading = ((((-(r.yaw + Math.PI + player.current.yaw) * 180) / Math.PI) % 360) + 360) % 360;
      const markers = interactablesGetter().filter((i) => i.marker && (!i.enabled || i.enabled())).map((i) => {
        const dx = i.x - r.x, dz = i.z - r.z;
        let rel = ((Math.atan2(dx, -dz) * 180) / Math.PI) - heading; rel = ((rel + 540) % 360) - 180;
        return { id: i.id, label: i.marker!.label, kind: i.marker!.kind, rel, distance: Math.hypot(dx, dz) };
      });
      hudStore.set({ heading, markers });
    }
    void dist;
    frame(dt, player.current);
  });
  // NOTE: never pass a priority > 0 to useFrame here. In R3F a positive priority switches OFF automatic rendering,
  // which froze the previous scene on screen when the Moon surface mounted.

  const done = api.getCompletedSites();
  const sim = api.getSim();
  const mars = destination === 'mars';

  return (
    <>
      <SurfaceLights destination={destination} lowPerf={lowPerf} />
      {mars ? <MarsSky /> : <MoonSky />}
      <DistantRange destination={destination} />
      <Terrain destination={destination} lowPerf={lowPerf} />
      <Boulders destination={destination} count={boulderCount} />
      <HabitatExterior x={world.habitat.x} z={world.habitat.z} alert={storm} />
      <SolarArray x={world.solarArray.x} z={world.solarArray.z} dust={sim.solarDustAccumulation} />
      <Lander x={world.lander.x} z={world.lander.z} mars={mars} />
      <ChargePad x={world.roverPad.x} z={world.roverPad.z} />
      <SampleStation x={world.sampleStation.x} z={world.sampleStation.z} done={api.getField().samples.includes(world.sampleStation.id)} destination={destination} />
      {world.sites.map((s) => (
        <group key={s.id}>
          <SiteProp id={s.id} x={s.x} z={s.z} done={done.includes(s.id)} destination={destination} />
          <Beacon x={s.x} z={s.z} done={done.includes(s.id)} destination={destination} />
        </group>
      ))}
      <group ref={roverGroup}><RoverModel variant={destination} driving={driving} /></group>
      <DriftingDust color={mars ? '#e0a070' : '#cfcfc8'} count={mars ? 420 : 120} wind={mars ? 3 : 0.3} opacity={mars ? 0.4 : 0.22} />
      <FirstPersonRig
        player={player} ground={ground} colliders={colliders}
        bounds={{ minX: -WORLD_HALF + 6, maxX: WORLD_HALF - 6, minZ: -WORLD_HALF + 6, maxZ: WORLD_HALF - 6 }}
        gravity={world.gravity} eye={1.72} walk={5.4} sprint={9.5} jump={destination === 'moon' ? 0.9 : 0.7}
        interactables={interactablesGetter} mode={paused ? 'frozen' : driving ? 'drive' : 'walk'} reducedMotion={api.reducedMotion}
        onFrame={({ dt, player: p }) => frame(dt, p)} resetKey={destination}
      />
    </>
  );
}
