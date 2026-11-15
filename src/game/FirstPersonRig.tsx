import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveCollisions, type Collider } from './terrain';
import { hudStore, input, type CompassMarker, type Interactable } from './runtime';
import { audio } from './audio';

export interface PlayerState {
  x: number;
  y: number; // feet
  z: number;
  yaw: number;
  pitch: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  moving: boolean;
  sprinting: boolean;
  speed: number;
}

export function newPlayer(x = 0, z = 0, yaw = 0): PlayerState {
  return { x, y: 0, z, yaw, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true, moving: false, sprinting: false, speed: 0 };
}

export interface RigFrameInfo {
  dt: number;
  player: PlayerState;
}

interface RigProps {
  player: MutableRefObject<PlayerState>;
  ground: (x: number, z: number) => number;
  colliders: () => readonly Collider[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  gravity: number;
  eye?: number;
  walk?: number;
  sprint?: number;
  jump?: number;
  /** Interactables are read every frame through a getter so scenes can mutate the list freely. */
  interactables: () => readonly Interactable[];
  /**
   * 'walk'   - full first-person control
   * 'drive'  - mouse look only (a vehicle owns the camera)
   * 'frozen' - a panel/menu is open: no input at all
   */
  mode: 'walk' | 'drive' | 'frozen';
  reducedMotion: boolean;
  footsteps?: boolean;
  /** Where compass markers should be measured from (usually the player). */
  onFrame?: (info: RigFrameInfo) => void;
  /** Hold-to-interact gets reset when this value changes (e.g. scene swap). */
  resetKey?: string;
}

const _fwd = new THREE.Vector3();
const SENSITIVITY = 0.0023;

export function FirstPersonRig({
  player, ground, colliders, bounds, gravity, eye = 1.72, walk = 5.6, sprint = 9.5, jump = 0.85,
  interactables, mode, reducedMotion, footsteps = true, onFrame, resetKey,
}: RigProps) {
  const { camera, gl } = useThree();
  const bobPhase = useRef(0);
  const hudAccum = useRef(0);
  const hold = useRef<{ id: string | null; t: number; fired: boolean }>({ id: null, t: 0, fired: false });
  const focusRef = useRef<Interactable | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // ----- mouse look: pointer lock when available, drag-look as a fallback -----
  useEffect(() => {
    input.attach();
    const el = gl.domElement;
    let dragging = false;
    let moved = 0;

    const look = (dx: number, dy: number) => {
      if (modeRef.current === 'frozen') return;
      const p = player.current;
      p.yaw -= dx * SENSITIVITY;
      p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch - dy * SENSITIVITY));
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === el) look(e.movementX, e.movementY);
      else if (dragging) { moved += Math.abs(e.movementX) + Math.abs(e.movementY); look(e.movementX, e.movementY); }
    };
    const onDown = (e: PointerEvent) => { if (e.button === 0) { dragging = true; moved = 0; } };
    const onUp = () => {
      if (dragging && moved < 6 && modeRef.current !== 'frozen' && document.pointerLockElement !== el) {
        try {
          const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
          if (r && typeof r.catch === 'function') r.catch(() => { /* drag-look still works */ });
        } catch { /* drag-look still works */ }
      }
      dragging = false;
    };
    const onLock = () => hudStore.set({ locked: document.pointerLockElement === el });
    document.addEventListener('mousemove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('pointerlockchange', onLock);
    return () => {
      document.removeEventListener('mousemove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerlockchange', onLock);
    };
  }, [gl, player]);

  useEffect(() => {
    // Test/debug hook, only active when the page URL ends with #debug (lets automated checks teleport the player).
    if (typeof window !== 'undefined' && window.location.hash === '#debug') (window as unknown as { __bsPlayer?: unknown }).__bsPlayer = player;
  }, [player]);

  useEffect(() => {
    hold.current = { id: null, t: 0, fired: false };
    focusRef.current = null;
    input.clear();
  }, [resetKey]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = player.current;
    if (modeRef.current === 'drive') { input.wasPressed('Space'); return; } // a vehicle controls camera, input and HUD
    const canMove = modeRef.current === 'walk' && !input.blocked;

    // ----- horizontal intent -----
    let ix = 0;
    let iz = 0;
    let wantSprint = false;
    if (canMove) {
      if (input.isDown('KeyW', 'ArrowUp')) iz += 1;
      if (input.isDown('KeyS', 'ArrowDown')) iz -= 1;
      if (input.isDown('KeyD', 'ArrowRight')) ix += 1;
      if (input.isDown('KeyA', 'ArrowLeft')) ix -= 1;
      wantSprint = input.isDown('ShiftLeft', 'ShiftRight');
    }
    const len = Math.hypot(ix, iz);
    if (len > 0) { ix /= len; iz /= len; }
    const speed = wantSprint ? sprint : walk;
    const sy = Math.sin(p.yaw);
    const cy = Math.cos(p.yaw);
    // forward = (-sin, -cos), right = (cos, -sin)
    const tvx = (-sy * iz + cy * ix) * speed;
    const tvz = (-cy * iz - sy * ix) * speed;
    const accel = p.onGround ? 12 : 2.2; // little air control in low gravity
    const k = Math.min(1, dt * accel);
    p.vx += (tvx - p.vx) * k;
    p.vz += (tvz - p.vz) * k;

    // ----- move with collision, one axis at a time so the player slides along walls -----
    const step = (dx: number, dz: number) => {
      let nx = p.x + dx;
      let nz = p.z + dz;
      nx = Math.max(bounds.minX, Math.min(bounds.maxX, nx));
      nz = Math.max(bounds.minZ, Math.min(bounds.maxZ, nz));
      const r = resolveCollisions(nx, nz, 0.45, colliders());
      nx = r.x; nz = r.z;
      // steep slopes block walking (about 45 degrees)
      if (p.onGround) {
        const rise = ground(nx, nz) - ground(p.x, p.z);
        const run = Math.hypot(nx - p.x, nz - p.z);
        if (run > 1e-4 && rise > run * 1.05 + 0.04) return;
      }
      p.x = nx; p.z = nz;
    };
    step(p.vx * dt, 0);
    step(0, p.vz * dt);

    // ----- vertical: low gravity, hop on Space, stick to the ground when walking downhill -----
    const g = ground(p.x, p.z);
    if (canMove && p.onGround && input.wasPressed('Space')) {
      p.vy = Math.sqrt(2 * gravity * jump);
      p.onGround = false;
    } else if (!canMove) input.wasPressed('Space');
    p.vy -= gravity * dt;
    p.y += p.vy * dt;
    if (p.y <= g) { if (!p.onGround && p.vy < -1.2 && footsteps) audio.sfx('thud', 0.8); p.y = g; p.vy = 0; p.onGround = true; }
    else if (p.onGround && p.y - g < 0.45 && p.vy <= 0) { p.y = g; p.vy = 0; }
    else p.onGround = false;

    const hs = Math.hypot(p.vx, p.vz);
    p.speed = hs;
    p.moving = hs > 0.6 && p.onGround;
    p.sprinting = p.moving && wantSprint;

    // ----- camera -----
    let bobY = 0;
    let bobX = 0;
    if (p.moving && !reducedMotion) {
      const before = bobPhase.current;
      bobPhase.current += dt * (p.sprinting ? 11 : 7.5);
      bobY = Math.sin(bobPhase.current) * 0.035;
      bobX = Math.cos(bobPhase.current * 0.5) * 0.02;
      if (footsteps && Math.floor(before / Math.PI) !== Math.floor(bobPhase.current / Math.PI)) audio.sfx('step', 0.7);
    } else if (p.moving && footsteps) {
      bobPhase.current += dt * 7;
      if (Math.floor((bobPhase.current - dt * 7) / Math.PI) !== Math.floor(bobPhase.current / Math.PI)) audio.sfx('step', 0.7);
    }
    camera.position.set(p.x + bobX * Math.cos(p.yaw), p.y + eye + bobY, p.z - bobX * Math.sin(p.yaw));
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');

    // ----- interaction focus -----
    camera.getWorldDirection(_fwd);
    const fx = _fwd.x;
    const fz = _fwd.z;
    const flen = Math.hypot(fx, fz) || 1;
    let best: Interactable | null = null;
    let bestScore = Infinity;
    const list = interactables();
    for (const it of list) {
      if (it.enabled && !it.enabled()) continue;
      const dx = it.x - p.x;
      const dz = it.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      if (it.y !== undefined && Math.abs(it.y - p.y) > 3.2) continue;
      const dot = d < 1e-4 ? 1 : (dx * fx + dz * fz) / (d * flen);
      if (dot < 0.15 && d > 2.2) continue;
      const score = d * (1.35 - dot);
      if (score < bestScore) { bestScore = score; best = it; }
    }
    focusRef.current = best;

    // press / hold handling
    const h = hold.current;
    if (!canMove) {
      if (h.id) { list.find((i) => i.id === h.id)?.onHoldCancel?.(); }
      h.id = null; h.t = 0; h.fired = false;
      input.wasPressed('KeyE');
    } else if (best) {
      if (best.hold && best.hold > 0) {
        if (input.isDown('KeyE')) {
          if (h.id !== best.id) { h.id = best.id; h.t = 0; h.fired = false; }
          if (!h.fired) {
            h.t += dt;
            const prog = Math.min(1, h.t / best.hold);
            best.onHold?.(prog);
            if (prog >= 1) { h.fired = true; best.onInteract(); }
          }
        } else {
          if (h.id && !h.fired) best.onHoldCancel?.();
          h.id = null; h.t = 0; h.fired = false;
        }
        input.wasPressed('KeyE');
      } else if (input.wasPressed('KeyE')) {
        best.onInteract();
      }
    } else {
      if (h.id) list.find((i) => i.id === h.id)?.onHoldCancel?.();
      h.id = null; h.t = 0; h.fired = false;
      input.wasPressed('KeyE');
    }

    onFrame?.({ dt, player: p });

    // ----- HUD (throttled) -----
    hudAccum.current += dt;
    if (hudAccum.current >= 0.1) {
      hudAccum.current = 0;
      const heading = ((((-p.yaw * 180) / Math.PI) % 360) + 360) % 360;
      const markers: CompassMarker[] = [];
      for (const it of list) {
        if (!it.marker) continue;
        if (it.enabled && !it.enabled()) continue;
        const dx = it.x - p.x;
        const dz = it.z - p.z;
        // world bearing of the target (0 = -z)
        const world = (Math.atan2(dx, -dz) * 180) / Math.PI;
        let rel = world - heading;
        rel = ((rel + 540) % 360) - 180;
        markers.push({ id: it.id, label: it.marker.label, kind: it.marker.kind, rel, distance: Math.hypot(dx, dz) });
      }
      const promptText = best ? (typeof best.prompt === 'function' ? best.prompt() : best.prompt) : null;
      hudStore.set({
        prompt: promptText,
        focusId: best ? best.id : null,
        holdProgress: h.id && best && best.hold ? Math.min(1, h.t / best.hold) : 0,
        heading,
        markers,
        speed: hs,
        sprinting: p.sprinting,
        driving: false,
      });
    }
  });

  return null;
}
