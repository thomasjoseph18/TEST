// Deterministic terrain + world layout for the first-person surfaces. Pure (no three.js, no React)
// so the exact same height function drives the mesh, the player's feet, the rover and object
// placement, and can be unit-tested in Node.
import type { Destination } from '../types.ts';

export const WORLD_HALF = 400; // terrain spans [-400, 400] on x and z

// ---- seeded value noise ------------------------------------------------------------------
function hash2(ix: number, iz: number, seed: number): number {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; // 0..1
}

export function fbm(x: number, z: number, seed: number, octaves = 5): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * freq, z * freq, seed + i * 17) - 0.5) * 2 * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm; // roughly -1..1
}

/** Small deterministic PRNG (mulberry32) for scattering props. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- craters ----------------------------------------------------------------------------
export interface Crater {
  x: number;
  z: number;
  r: number;
  depth: number;
}

function generateCraters(seed: number, count: number, avoid: { x: number; z: number; r: number }[]): Crater[] {
  const rand = rng(seed);
  const out: Crater[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 2000) {
    const r = 6 + Math.pow(rand(), 2.2) * 38;
    const x = (rand() * 2 - 1) * (WORLD_HALF - r - 10);
    const z = (rand() * 2 - 1) * (WORLD_HALF - r - 10);
    if (avoid.some((a) => Math.hypot(x - a.x, z - a.z) < a.r + r + 6)) continue;
    out.push({ x, z, r, depth: r * (0.16 + rand() * 0.1) });
  }
  return out;
}

function craterOffset(c: Crater, x: number, z: number): number {
  const d = Math.hypot(x - c.x, z - c.z);
  const t = d / c.r;
  if (t > 1.6) return 0;
  let y = 0;
  if (t < 1) y -= c.depth * (1 - smooth(Math.pow(t, 1.4))) * 1.0 - c.depth * 0.12 * (1 - t); // bowl with a slightly raised floor centre
  if (t > 0.8 && t < 1.6) y += Math.sin(((t - 0.8) / 0.8) * Math.PI) * c.depth * 0.38; // rim
  return y;
}

// ---- world definitions -------------------------------------------------------------------
export interface SiteSpot {
  id: string;
  x: number;
  z: number;
  /** Interaction radius in metres. */
  radius: number;
}

export interface Collider {
  /** Circle (r) or axis-aligned box (hx, hz half-sizes). */
  x: number;
  z: number;
  r?: number;
  hx?: number;
  hz?: number;
}

export interface SurfaceWorld {
  destination: Destination;
  /** Spawn just outside the airlock, and which way to face (yaw 0 faces -z; PI faces +z). */
  spawn: { x: number; z: number; yaw: number };
  airlock: { x: number; z: number };
  habitat: { x: number; z: number; r: number };
  solarArray: { x: number; z: number };
  roverPad: { x: number; z: number };
  lander: { x: number; z: number };
  sampleStation: { id: string; x: number; z: number };
  sites: SiteSpot[];
  craters: Crater[];
  gravity: number; // m/s^2
  seed: number;
}

const MOON_SITES: SiteSpot[] = [
  { id: 'moon-apollo-11', x: 38, z: 46, radius: 3.5 },
  { id: 'moon-shackleton-rim', x: 92, z: 262, radius: 5 },
  { id: 'moon-lunar-rover', x: -196, z: 152, radius: 6 },
  { id: 'moon-psr-cold-trap', x: -150, z: -250, radius: 7 },
];

const MARS_SITES: SiteSpot[] = [
  { id: 'mars-moxie-station', x: 52, z: 58, radius: 4 },
  { id: 'mars-jezero-delta', x: -150, z: 196, radius: 6 },
  { id: 'mars-dust-storm-basin', x: 214, z: -128, radius: 6 },
  { id: 'mars-subsurface-glacier', x: -70, z: -262, radius: 6 },
];

const base = {
  spawn: { x: 0, z: 14, yaw: Math.PI },
  airlock: { x: 0, z: 9.4 },
  habitat: { x: 0, z: 0, r: 10 },
  solarArray: { x: -17, z: 7 },
  roverPad: { x: 11, z: 17 },
  lander: { x: 26, z: -6 },
};

export const MOON_WORLD: SurfaceWorld = {
  destination: 'moon',
  ...base,
  sampleStation: { id: 'moon-regolith', x: -26, z: 40 },
  sites: MOON_SITES,
  craters: [],
  gravity: 1.62,
  seed: 11,
};
export const MARS_WORLD: SurfaceWorld = {
  destination: 'mars',
  ...base,
  sampleStation: { id: 'mars-rock', x: -22, z: 38 },
  sites: MARS_SITES,
  craters: [],
  gravity: 3.72,
  seed: 29,
};

const KEEP_CLEAR = (w: SurfaceWorld) => [
  { x: 0, z: 0, r: 44 },
  ...w.sites.map((s) => ({ x: s.x, z: s.z, r: 18 })),
  { x: w.sampleStation.x, z: w.sampleStation.z, r: 14 },
];

MOON_WORLD.craters = [
  // The permanently shadowed crater (a real PSR is a deep crater whose floor never sees the Sun).
  { x: -150, z: -250, r: 88, depth: 30 },
  ...generateCraters(101, 26, [...KEEP_CLEAR(MOON_WORLD), { x: -150, z: -250, r: 100 }]),
];
MARS_WORLD.craters = generateCraters(203, 14, KEEP_CLEAR(MARS_WORLD));

export function getWorld(destination: Destination): SurfaceWorld {
  return destination === 'mars' ? MARS_WORLD : MOON_WORLD;
}

// ---- height functions ---------------------------------------------------------------------
/** Flatten terrain smoothly around a point (landing pad, base). */
function pad(y: number, x: number, z: number, cx: number, cz: number, inner: number, outer: number): number {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= outer) return y;
  if (d <= inner) return 0;
  return y * smooth((d - inner) / (outer - inner));
}

export function moonHeight(x: number, z: number): number {
  const w = MOON_WORLD;
  // Rolling regolith plains: gentle, low frequency.
  let y = fbm(x * 0.006, z * 0.006, w.seed, 4) * 7 + fbm(x * 0.03, z * 0.03, w.seed + 5, 3) * 1.3;
  // Shackleton rim: a broad ridge to the north with a high massif near the overlook.
  const ridgeZ = 268 + fbm(x * 0.01, 3.3, w.seed + 9, 3) * 22;
  const ridge = Math.max(0, 1 - Math.abs(z - ridgeZ) / 95);
  y += smooth(ridge) * (34 + fbm(x * 0.012, 7.1, w.seed + 3, 3) * 14);
  // Overlook mesa: a gentle bump so the scan point feels like a vantage point.
  const mesa = Math.max(0, 1 - Math.hypot(x - 92, z - 262) / 46);
  y += smooth(mesa) * 8;
  for (const c of w.craters) y += craterOffset(c, x, z);
  y = pad(y, x, z, 0, 8, 26, 70);
  return y;
}

export function marsHeight(x: number, z: number): number {
  const w = MARS_WORLD;
  let y = fbm(x * 0.007, z * 0.007, w.seed, 4) * 6 + fbm(x * 0.04, z * 0.04, w.seed + 4, 3) * 1.2;
  // Jezero delta: a lobed fan rising to the north-west with a steep scarp at its front.
  const dx = x + 150;
  const dz = z - 196;
  const dd = Math.hypot(dx * 0.8, dz);
  const fan = Math.max(0, 1 - dd / 150);
  const scarp = smooth(Math.min(1, fan * 3.2));
  const s6 = scarp * 6;
  const k6 = Math.floor(s6);
  const terraces = (k6 + smooth(smooth(s6 - k6))) / 6; // layered sediment steps with walkable risers
  y += terraces * 18 + scarp * 4 + fbm(x * 0.05, z * 0.05, 4.4, 2) * fan * 2;
  // Channels cutting across the fan.
  y -= Math.max(0, 1 - Math.abs(Math.sin((x + z * 0.4) * 0.055)) * 3.2) * fan * 2.6;
  // Raised ridge (buried glacier) in the south.
  const gl = Math.max(0, 1 - Math.hypot((x + 70) * 0.7, z + 262) / 120);
  y += smooth(gl) * 12;
  // Crater rim wall in the far distance (Jezero is a ~45 km crater: this is the visible rim).
  const rd = Math.hypot(x, z);
  y += smooth(Math.min(1, Math.max(0, (rd - 330) / 70))) * 26;
  for (const c of w.craters) y += craterOffset(c, x, z);
  y = pad(y, x, z, 0, 8, 26, 70);
  return y;
}

export function terrainHeight(destination: Destination, x: number, z: number): number {
  return destination === 'mars' ? marsHeight(x, z) : moonHeight(x, z);
}

/** Terrain slope magnitude (rise/run) by central difference. */
export function terrainSlope(destination: Destination, x: number, z: number): number {
  const e = 1.2;
  const dx = terrainHeight(destination, x + e, z) - terrainHeight(destination, x - e, z);
  const dz = terrainHeight(destination, x, z + e) - terrainHeight(destination, x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

// ---- scattered boulders -------------------------------------------------------------------
export interface Boulder {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
  tilt: number;
  tone: number;
  /** Large enough to block the player and rover. */
  solid: boolean;
}

export function generateBoulders(destination: Destination, count: number): Boulder[] {
  const w = getWorld(destination);
  const rand = rng(w.seed * 7 + 3);
  const out: Boulder[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 8) {
    const x = (rand() * 2 - 1) * (WORLD_HALF - 8);
    const z = (rand() * 2 - 1) * (WORLD_HALF - 8);
    // keep the base area and the spawn corridor tidy
    if (Math.hypot(x, z - 10) < 24) continue;
    const big = rand() < 0.07;
    const scale = big ? 1.6 + rand() * 2.6 : 0.2 + Math.pow(rand(), 2.2) * 1.2;
    out.push({
      x, z, y: terrainHeight(destination, x, z) + scale * 0.15,
      scale, rotY: rand() * Math.PI * 2, tilt: (rand() - 0.5) * 0.5, tone: rand(),
      solid: scale > 1.2,
    });
  }
  return out;
}

// ---- collisions ---------------------------------------------------------------------------
/** Static colliders around the base (habitat, lander, array, memorial...). */
export function baseColliders(destination: Destination): Collider[] {
  const w = getWorld(destination);
  const list: Collider[] = [
    { x: w.habitat.x, z: w.habitat.z - 1, r: w.habitat.r },
    { x: w.lander.x, z: w.lander.z, r: 4.2 },
    { x: w.solarArray.x, z: w.solarArray.z, hx: 4.6, hz: 1.2 },
    { x: w.sampleStation.x, z: w.sampleStation.z, r: 1.3 },
  ];
  for (const s of w.sites) list.push({ x: s.x, z: s.z, r: s.id.includes('apollo') ? 1.4 : 1.0 });
  return list;
}

/** Push a circle (position p, radius r) out of any collider. Returns the corrected position. */
export function resolveCollisions(px: number, pz: number, radius: number, colliders: readonly Collider[]): { x: number; z: number; hit: boolean } {
  let x = px;
  let z = pz;
  let hit = false;
  for (const c of colliders) {
    if (c.r !== undefined) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + radius;
      if (d < min) {
        hit = true;
        if (d < 1e-6) { x = c.x + min; } else { x = c.x + (dx / d) * min; z = c.z + (dz / d) * min; }
      }
    } else if (c.hx !== undefined && c.hz !== undefined) {
      const cx = Math.max(c.x - c.hx, Math.min(x, c.x + c.hx));
      const cz = Math.max(c.z - c.hz, Math.min(z, c.z + c.hz));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        hit = true;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * radius;
          z = cz + (dz / d) * radius;
        } else {
          // centre inside the box: push out along the shallowest axis
          const ox = c.hx - Math.abs(x - c.x);
          const oz = c.hz - Math.abs(z - c.z);
          if (ox < oz) x = c.x + Math.sign(x - c.x || 1) * (c.hx + radius);
          else z = c.z + Math.sign(z - c.z || 1) * (c.hz + radius);
        }
      }
    }
  }
  return { x, z, hit };
}

export function clampToWorld(v: number, margin = 6): number {
  return Math.max(-WORLD_HALF + margin, Math.min(WORLD_HALF - margin, v));
}

/** Is this point inside the permanently shadowed crater (cold, dark, heaters working hard)? */
export function inColdShadow(destination: Destination, x: number, z: number): boolean {
  if (destination !== 'moon') return false;
  const psr = MOON_WORLD.craters[0];
  return Math.hypot(x - psr.x, z - psr.z) < psr.r * 0.78;
}

// ---- habitat interior layout --------------------------------------------------------------
export interface HabitatStation {
  id: string;
  system: 'oxygen' | 'water' | 'power' | 'food' | 'radiation' | 'bunk' | 'console' | 'airlock' | 'suit' | 'comms';
  x: number;
  z: number;
  radius: number;
}

export const HABITAT_HALF = { x: 16, z: 7 };

export const HABITAT_STATIONS: HabitatStation[] = [
  { id: 'hydroponics', system: 'food', x: -12.6, z: 0, radius: 3.4 },
  { id: 'oxygen', system: 'oxygen', x: -7, z: 5.2, radius: 2.8 },
  { id: 'water', system: 'water', x: -0.5, z: 5.2, radius: 2.8 },
  { id: 'power', system: 'power', x: 6.5, z: 5.2, radius: 2.8 },
  { id: 'bunk', system: 'bunk', x: -7, z: -5.4, radius: 2.6 },
  { id: 'console', system: 'console', x: 0, z: -5.4, radius: 2.8 },
  { id: 'comms', system: 'comms', x: 7, z: -5.4, radius: 2.6 },
  { id: 'shelter', system: 'radiation', x: 12.6, z: -4.2, radius: 2.8 },
  { id: 'suitrack', system: 'suit', x: 13, z: 3.6, radius: 2.6 },
  { id: 'airlock', system: 'airlock', x: 14.6, z: 0, radius: 2.2 },
];

export const HABITAT_COLLIDERS: Collider[] = [
  { x: -14.4, z: 0, hx: 1.1, hz: 3.4 }, // hydroponics racks
  { x: -7, z: 6.1, hx: 1.8, hz: 0.7 }, // oxygen generator
  { x: -0.5, z: 6.1, hx: 1.8, hz: 0.7 }, // water recycler
  { x: 6.5, z: 6.1, hx: 1.8, hz: 0.7 }, // power bank
  { x: -7, z: -6.0, hx: 1.6, hz: 0.9 }, // bunk
  { x: 0, z: -6.2, hx: 1.8, hz: 0.7 }, // console
  { x: 7, z: -6.2, hx: 1.6, hz: 0.7 }, // comms
  { x: 13.8, z: -5.6, hx: 1.6, hz: 1.0 }, // shelter alcove
  { x: 14.6, z: 4.6, hx: 0.8, hz: 1.0 }, // suit rack
  { x: 0, z: 0, r: 1.35 }, // centre table with the holo-map
];
