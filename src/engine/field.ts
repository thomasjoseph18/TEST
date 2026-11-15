// Field-systems layer for the first-person game: astronaut suit, rover, radiation, food/hydroponics
// and crew health. Pure functions, no React, no DOM: safe to unit-test in Node.
//
// This layer sits ON TOP of the 30-Sol habitat simulation (src/engine/simulation.ts). It never
// changes the simulation's equations. It reads the simulation's state and, through explicit
// "draw" requests, asks the habitat for oxygen / battery when the player refills a suit or rover.
import type { Destination, HabitatSimulationState } from '../types.ts';

export const clamp = (v: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, v));

export const HABITAT_SYSTEMS = ['oxygen', 'water', 'power', 'food', 'radiation'] as const;
export type HabitatSystemId = (typeof HABITAT_SYSTEMS)[number];

export interface RoverState {
  battery: number; // 0-100
  integrity: number; // 0-100
}

export interface FieldState {
  suitO2: number; // 0-100
  suitPower: number; // 0-100
  suitHealth: number; // 0-100 ("HP")
  /** Cumulative radiation exposure index, 0-100. Falls slowly while resting in the habitat. */
  radiationDose: number;
  /** Food pantry, 0-100. */
  foodLevel: number;
  /** Hydroponic crop maturity, 0-100. Harvest at 100. */
  cropGrowth: number;
  crewHealth: number; // 0-100
  rover: RoverState;
  /** Science samples collected on the surface (ids). */
  samples: string[];
  /** Habitat systems the player has inspected (HABITAT_SYSTEMS ids). */
  inspected: string[];
  /** Simple one-way progress flags: eva_started, solar_cleaned, rover_driven, harvested, ... */
  flags: Record<string, boolean>;
  evaSeconds: number;
  /** Times the suit ran dry and the player had to be recovered. */
  recoveries: number;
}

export function createFieldState(): FieldState {
  return {
    suitO2: 100,
    suitPower: 100,
    suitHealth: 100,
    radiationDose: 0,
    foodLevel: 100,
    cropGrowth: 20,
    crewHealth: 100,
    rover: { battery: 100, integrity: 100 },
    samples: [],
    inspected: [],
    flags: {},
    evaSeconds: 0,
    recoveries: 0,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, lo = 0, hi = 100): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Repair an unknown value into a valid FieldState. Never throws. */
export function sanitizeField(raw: unknown): FieldState {
  const d = createFieldState();
  if (!isObj(raw)) return d;
  const rover = isObj(raw.rover) ? raw.rover : {};
  const flags: Record<string, boolean> = {};
  if (isObj(raw.flags)) for (const [k, v] of Object.entries(raw.flags)) if (v === true) flags[k] = true;
  return {
    suitO2: num(raw.suitO2, d.suitO2),
    suitPower: num(raw.suitPower, d.suitPower),
    suitHealth: num(raw.suitHealth, d.suitHealth),
    radiationDose: num(raw.radiationDose, d.radiationDose),
    foodLevel: num(raw.foodLevel, d.foodLevel),
    cropGrowth: num(raw.cropGrowth, d.cropGrowth),
    crewHealth: num(raw.crewHealth, d.crewHealth),
    rover: { battery: num(rover.battery, d.rover.battery), integrity: num(rover.integrity, d.rover.integrity) },
    samples: strList(raw.samples),
    inspected: strList(raw.inspected),
    flags,
    evaSeconds: num(raw.evaSeconds, 0, 0, 1e9),
    recoveries: num(raw.recoveries, 0, 0, 1e6),
  };
}

// ---------------------------------------------------------------------------------------------
// Solar storms. Deterministic (no randomness) so lessons and tests are repeatable.
// ---------------------------------------------------------------------------------------------
const STORM_SOLS: Record<Destination, number[]> = {
  moon: [6, 14, 22, 27],
  mars: [9, 18, 25],
};

/** True on Sols with a solar particle event: surface radiation is much stronger. */
export function isSolarStorm(destination: Destination, sol: number): boolean {
  return STORM_SOLS[destination].includes(sol);
}

/** The next storm after `sol`, or null. Used for NOVA warnings. */
export function nextStormSol(destination: Destination, sol: number): number | null {
  const later = STORM_SOLS[destination].filter((s) => s >= sol);
  return later.length > 0 ? Math.min(...later) : null;
}

// ---------------------------------------------------------------------------------------------
// Suit and radiation: per-second ticking while on the surface (EVA).
// ---------------------------------------------------------------------------------------------
export interface SuitTickContext {
  /** Seconds since the previous tick (callers clamp this; it is clamped again here). */
  dt: number;
  moving: boolean;
  sprinting: boolean;
  /** Player is inside the rover (suit draws less). */
  inRover: boolean;
  /** Standing in a permanently shadowed / very cold place: heaters work harder. */
  inColdShadow: boolean;
  storm: boolean;
  /** Player is inside the storm shelter or habitat (no radiation, no suit drain). */
  sheltered: boolean;
}

export const SUIT_RATES = {
  o2Idle: 0.1,
  o2Walk: 0.06,
  o2Sprint: 0.12,
  o2Rover: -0.04, // the rover has its own air supply: the suit drains a bit less
  powerIdle: 0.07,
  powerCold: 0.1,
  radiationNormal: 0.03,
  radiationStorm: 0.22,
  healthLoss: 2.0,
} as const;

export function tickSuit(f: FieldState, ctx: SuitTickContext): FieldState {
  const dt = clamp(ctx.dt, 0, 0.5);
  if (dt === 0 || ctx.sheltered) return f;

  let o2Rate: number = SUIT_RATES.o2Idle;
  if (ctx.moving) o2Rate += SUIT_RATES.o2Walk;
  if (ctx.moving && ctx.sprinting) o2Rate += SUIT_RATES.o2Sprint - SUIT_RATES.o2Walk;
  if (ctx.inRover) o2Rate += SUIT_RATES.o2Rover;
  const powerRate = SUIT_RATES.powerIdle + (ctx.inColdShadow ? SUIT_RATES.powerCold : 0);
  const radRate = ctx.storm ? SUIT_RATES.radiationStorm : SUIT_RATES.radiationNormal;

  const suitO2 = clamp(f.suitO2 - o2Rate * dt);
  const suitPower = clamp(f.suitPower - powerRate * dt);
  const radiationDose = clamp(f.radiationDose + radRate * dt);

  let suitHealth = f.suitHealth;
  if (suitO2 <= 0 || suitPower <= 0) suitHealth = clamp(suitHealth - SUIT_RATES.healthLoss * dt);
  else if (radiationDose >= 85) suitHealth = clamp(suitHealth - 0.4 * dt);

  return { ...f, suitO2, suitPower, suitHealth, radiationDose, evaSeconds: f.evaSeconds + dt };
}

export type SuitWarning = 'ok' | 'low_o2' | 'low_power' | 'radiation' | 'critical';

export function suitWarning(f: FieldState, storm: boolean): SuitWarning {
  if (f.suitO2 <= 8 || f.suitPower <= 5 || f.suitHealth <= 40) return 'critical';
  if (f.suitO2 <= 25) return 'low_o2';
  if (f.suitPower <= 20) return 'low_power';
  if (storm || f.radiationDose >= 60) return 'radiation';
  return 'ok';
}

/** Remaining safe EVA time in seconds at a walking pace. Handy for HUD and NOVA. */
export function evaSecondsRemaining(f: FieldState): number {
  const o2 = f.suitO2 / (SUIT_RATES.o2Idle + SUIT_RATES.o2Walk);
  const power = f.suitPower / SUIT_RATES.powerIdle;
  return Math.max(0, Math.floor(Math.min(o2, power)));
}

/** The suit ran dry: crew recovery returns the astronaut to the airlock with a penalty. */
export function needsRecovery(f: FieldState): boolean {
  return f.suitHealth <= 0;
}

export function applyRecovery(f: FieldState): FieldState {
  return {
    ...f,
    suitHealth: 60,
    suitO2: 30,
    suitPower: 30,
    crewHealth: clamp(f.crewHealth - 15),
    recoveries: f.recoveries + 1,
    rover: { ...f.rover, integrity: f.rover.integrity },
  };
}

// ---------------------------------------------------------------------------------------------
// Refilling from the habitat: a real trade-off, because resources are shared with life support.
// ---------------------------------------------------------------------------------------------
export interface ResourceDraw {
  oxygen: number; // habitat oxygen % spent
  battery: number; // habitat battery % spent
}

/** Cost of topping the suit back to full. Scaled by how empty it is. */
export function suitRefillCost(f: FieldState): ResourceDraw {
  const o2Missing = 100 - f.suitO2;
  const powerMissing = 100 - f.suitPower;
  return { oxygen: Math.round((o2Missing / 100) * 3 * 10) / 10, battery: Math.round((powerMissing / 100) * 2 * 10) / 10 };
}

export function roverChargeCost(f: FieldState): ResourceDraw {
  return { oxygen: 0, battery: Math.round(((100 - f.rover.battery) / 100) * 4 * 10) / 10 };
}

/** Whether the habitat can afford a draw without being pushed into the red. */
export function canAfford(sim: HabitatSimulationState, cost: ResourceDraw): boolean {
  return sim.oxygenLevel - cost.oxygen > 5 && sim.batteryCharge - cost.battery > 0;
}

export function refillSuit(f: FieldState): FieldState {
  return { ...f, suitO2: 100, suitPower: 100, suitHealth: Math.max(f.suitHealth, 60) };
}

export function chargeRover(f: FieldState): FieldState {
  return { ...f, rover: { ...f.rover, battery: 100 } };
}

// ---------------------------------------------------------------------------------------------
// Rover
// ---------------------------------------------------------------------------------------------
export const ROVER = { maxSpeed: 11, reverseSpeed: 4, drainPerSecondAtSpeed: 0.28, idleDrain: 0.02 } as const;

export function tickRover(f: FieldState, dt: number, speed: number): FieldState {
  const d = clamp(dt, 0, 0.5);
  const drain = (Math.abs(speed) / ROVER.maxSpeed) * ROVER.drainPerSecondAtSpeed + ROVER.idleDrain;
  return { ...f, rover: { ...f.rover, battery: clamp(f.rover.battery - drain * d) } };
}

/** Hitting something hard at speed damages the rover; slow bumps are free. */
export function roverImpact(f: FieldState, speed: number): FieldState {
  const s = Math.abs(speed);
  if (s < 5) return f;
  return { ...f, rover: { ...f.rover, integrity: clamp(f.rover.integrity - Math.round((s - 4) * 1.5)) } };
}

// ---------------------------------------------------------------------------------------------
// Sol rollover: food, crops, radiation recovery, crew health.
// ---------------------------------------------------------------------------------------------
export const CROP = { growthPerSol: 13, boostedGrowthPerSol: 17, harvestFood: 30, eatPerSol: 4 } as const;

/** Plants need the science-lab power channel, some water and a charged battery. */
export function cropsCanGrow(sim: HabitatSimulationState): boolean {
  return sim.powerAllocation.scienceLab && sim.waterLevel > 10 && sim.batteryCharge > 0;
}

export interface SolRolloverReport {
  field: FieldState;
  notes: string[];
}

/**
 * Called once each time the habitat simulation completes a Sol. `next` is the simulation state
 * AFTER advancing. The suit and rover are recharged overnight (the caller spends habitat resources).
 */
export function advanceFieldSol(f: FieldState, next: HabitatSimulationState, destination: Destination): SolRolloverReport {
  const notes: string[] = [];

  let food = f.foodLevel - CROP.eatPerSol;
  let crop = f.cropGrowth;
  if (cropsCanGrow(next)) {
    crop += next.waterRecyclerMode === 'advanced' || next.waterRecyclerMode === 'hyper' ? CROP.boostedGrowthPerSol : CROP.growthPerSol;
  } else {
    notes.push('The plants did not grow: they need the Science Lab power channel, water and a charged battery.');
  }
  crop = clamp(crop);
  if (crop >= 100) notes.push('The crops are ready to harvest!');

  food = clamp(food);

  let crewHealth = f.crewHealth;
  if (food <= 0) {
    crewHealth -= 10;
    notes.push('The pantry is empty. The crew is getting weak.');
  }
  if (f.radiationDose >= 70) {
    crewHealth -= 8;
    notes.push('High radiation exposure is making the crew unwell. Stay inside during solar storms.');
  }
  if (next.oxygenLevel < 25) {
    crewHealth -= 5;
    notes.push('Low oxygen in the habitat is making the crew tired.');
  }
  const healthy = food > 20 && f.radiationDose < 50 && next.oxygenLevel >= 40;
  if (healthy) crewHealth += 4;

  // Resting in the habitat lets radiation exposure fade.
  const radiationDose = clamp(f.radiationDose - 8);

  const storm = isSolarStorm(destination, next.currentSol);
  if (storm) notes.push('Solar particle event today! Keep EVAs short, or stay inside the shielded habitat.');

  return {
    field: {
      ...f,
      foodLevel: food,
      cropGrowth: crop,
      crewHealth: clamp(crewHealth),
      radiationDose,
      // overnight recharge of suit; the caller pays for it from the habitat
      suitHealth: Math.max(f.suitHealth, 60),
    },
    notes,
  };
}

export function canHarvest(f: FieldState): boolean {
  return f.cropGrowth >= 100;
}

export function harvestCrops(f: FieldState): FieldState {
  if (!canHarvest(f)) return f;
  return { ...f, cropGrowth: 0, foodLevel: clamp(f.foodLevel + CROP.harvestFood), flags: { ...f.flags, harvested: true } };
}

export function inspectSystem(f: FieldState, id: HabitatSystemId): FieldState {
  return f.inspected.includes(id) ? f : { ...f, inspected: [...f.inspected, id] };
}

export function addSample(f: FieldState, id: string): FieldState {
  return f.samples.includes(id) ? f : { ...f, samples: [...f.samples, id] };
}

export function setFlag(f: FieldState, flag: string): FieldState {
  return f.flags[flag] ? f : { ...f, flags: { ...f.flags, [flag]: true } };
}

/** Drawing resources from the habitat simulation (clamped, never negative). */
export function drawFromHabitat(sim: HabitatSimulationState, cost: ResourceDraw): HabitatSimulationState {
  if (sim.missionStatus !== 'active') return sim;
  return {
    ...sim,
    oxygenLevel: clamp(Math.round((sim.oxygenLevel - cost.oxygen) * 10) / 10),
    batteryCharge: clamp(Math.round((sim.batteryCharge - cost.battery) * 10) / 10),
  };
}
