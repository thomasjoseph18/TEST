import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceFieldSol, applyRecovery, canAfford, canHarvest, chargeRover, createFieldState, drawFromHabitat, evaSecondsRemaining,
  harvestCrops, isSolarStorm, needsRecovery, nextStormSol, refillSuit, roverImpact, sanitizeField, suitRefillCost, suitWarning,
  tickRover, tickSuit, type SuitTickContext,
} from '../src/engine/field.ts';
import {
  computeMissionResult, nextObjective, objectiveProgress, objectiveStatus, OBJECTIVES, rankFor, SITE_TASKS, taskForSite,
} from '../src/engine/objectives.ts';
import { createNewSave, migrateSave, writeSave, loadSave, SAVE_KEY, type StorageLike } from '../src/engine/save.ts';
import { completeSiteTask, resetDestinationProgress, siteIdsFor } from '../src/engine/progress.ts';
import { advanceSolState, getInitialSimulationState } from '../src/engine/simulation.ts';
import {
  baseColliders, clampToWorld, generateBoulders, getWorld, inColdShadow, marsHeight, moonHeight, resolveCollisions, terrainHeight,
  WORLD_HALF, HABITAT_COLLIDERS, HABITAT_STATIONS, HABITAT_HALF,
} from '../src/game/terrain.ts';

const walk: SuitTickContext = { dt: 0.1, moving: true, sprinting: false, inRover: false, inColdShadow: false, storm: false, sheltered: false };

function mem(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
}

// ---------- suit, radiation, rover ----------
test('suit: drains while walking, faster when sprinting, and sheltered time is free', () => {
  let f = createFieldState();
  for (let i = 0; i < 100; i++) f = tickSuit(f, walk);
  const walked = 100 - f.suitO2;
  let g = createFieldState();
  for (let i = 0; i < 100; i++) g = tickSuit(g, { ...walk, sprinting: true });
  assert.ok(100 - g.suitO2 > walked, 'sprinting costs more oxygen');
  const s = tickSuit(createFieldState(), { ...walk, sheltered: true });
  assert.equal(s.suitO2, 100);
  assert.equal(s.radiationDose, 0);
});

test('suit: storms add radiation far faster, cold shadow drains suit power faster', () => {
  const calm = tickSuit(createFieldState(), { ...walk, dt: 0.5 });
  const storm = tickSuit(createFieldState(), { ...walk, dt: 0.5, storm: true });
  assert.ok(storm.radiationDose > calm.radiationDose * 4);
  const cold = tickSuit(createFieldState(), { ...walk, dt: 0.5, inColdShadow: true });
  assert.ok(cold.suitPower < calm.suitPower);
});

test('suit: running dry hurts health, recovery costs crew health and returns a safe suit', () => {
  let f = { ...createFieldState(), suitO2: 0.01 };
  for (let i = 0; i < 2000 && !needsRecovery(f); i++) f = tickSuit(f, walk);
  assert.ok(needsRecovery(f));
  const r = applyRecovery(f);
  assert.equal(r.recoveries, 1);
  assert.ok(r.crewHealth < 100);
  assert.ok(r.suitHealth > 0 && r.suitO2 > 0);
  assert.equal(suitWarning({ ...createFieldState(), suitO2: 5 }, false), 'critical');
  assert.equal(suitWarning({ ...createFieldState(), suitO2: 20 }, false), 'low_o2');
  assert.equal(suitWarning(createFieldState(), true), 'radiation');
  assert.equal(suitWarning(createFieldState(), false), 'ok');
});

test('suit: tick ignores huge dt and zero dt', () => {
  const f = createFieldState();
  assert.equal(tickSuit(f, { ...walk, dt: 0 }), f);
  const big = tickSuit(f, { ...walk, dt: 999 });
  assert.ok(f.suitO2 - big.suitO2 < 1, 'dt is clamped to 0.5 s');
  assert.ok(evaSecondsRemaining(f) > 120);
});

test('refill and rover charging cost habitat resources and can be refused', () => {
  const sim = getInitialSimulationState('moon');
  const empty = { ...createFieldState(), suitO2: 0, suitPower: 0 };
  const cost = suitRefillCost(empty);
  assert.ok(cost.oxygen > 0 && cost.battery > 0);
  assert.ok(canAfford(sim, cost));
  assert.equal(canAfford({ ...sim, oxygenLevel: 6 }, cost), false);
  const after = drawFromHabitat(sim, cost);
  assert.ok(after.oxygenLevel < sim.oxygenLevel && after.batteryCharge < sim.batteryCharge);
  assert.equal(refillSuit(empty).suitO2, 100);
  const flat = { ...createFieldState(), rover: { battery: 0, integrity: 100 } };
  assert.equal(chargeRover(flat).rover.battery, 100);
  assert.deepEqual(drawFromHabitat({ ...sim, missionStatus: 'critical' }, cost).oxygenLevel, sim.oxygenLevel);
});

test('rover: battery drains with speed; only hard hits damage it', () => {
  const f = createFieldState();
  assert.ok(tickRover(f, 1, 11).rover.battery < tickRover(f, 1, 2).rover.battery);
  assert.equal(roverImpact(f, 3), f);
  assert.ok(roverImpact(f, 10).rover.integrity < 100);
});

// ---------- food, crops, sol rollover ----------
test('food: crops need science-lab power; harvest feeds the crew; empty pantry hurts crew health', () => {
  let sim = getInitialSimulationState('moon');
  let f = createFieldState();
  const grown = advanceFieldSol(f, sim, 'moon').field;
  assert.ok(grown.cropGrowth > f.cropGrowth);
  const dark = { ...sim, powerAllocation: { ...sim.powerAllocation, scienceLab: false } };
  const stalled = advanceFieldSol(f, dark, 'moon');
  assert.equal(stalled.field.cropGrowth, f.cropGrowth);
  assert.ok(stalled.notes.some((n) => n.includes('did not grow')));

  f = { ...f, cropGrowth: 100, foodLevel: 40 };
  assert.ok(canHarvest(f));
  const h = harvestCrops(f);
  assert.equal(h.cropGrowth, 0);
  assert.ok(h.foodLevel > 40);
  assert.equal(harvestCrops(h), h, 'cannot harvest an empty tray');

  sim = { ...sim, currentSol: 12 };
  const hungry = advanceFieldSol({ ...createFieldState(), foodLevel: 0 }, sim, 'moon');
  assert.ok(hungry.field.crewHealth < 100);
});

test('radiation fades overnight; storm sols are deterministic and announced', () => {
  const sim = { ...getInitialSimulationState('moon'), currentSol: 5 };
  const rolled = advanceFieldSol({ ...createFieldState(), radiationDose: 50 }, sim, 'moon').field;
  assert.ok(rolled.radiationDose < 50);
  assert.equal(isSolarStorm('moon', 6), true);
  assert.equal(isSolarStorm('moon', 7), false);
  assert.equal(nextStormSol('moon', 7), 14);
  assert.equal(nextStormSol('mars', 26), null);
  const stormDay = advanceFieldSol(createFieldState(), { ...sim, currentSol: 6 }, 'moon');
  assert.ok(stormDay.notes.some((n) => n.includes('Solar particle')));
});

test('field state sanitiser repairs junk without throwing', () => {
  const junk = sanitizeField({ suitO2: 'x', foodLevel: 9999, rover: 7, samples: [1, 'a'], flags: { a: true, b: 'yes' } });
  assert.equal(junk.suitO2, 100);
  assert.equal(junk.foodLevel, 100);
  assert.deepEqual(junk.samples, ['a']);
  assert.deepEqual(junk.flags, { a: true });
  assert.deepEqual(sanitizeField(null), createFieldState());
});

// ---------- objectives and scoring ----------
test('objectives: every site task has a quiz, a known site and exactly one correct answer index', () => {
  for (const d of ['moon', 'mars'] as const) {
    for (const id of siteIdsFor(d)) assert.ok(taskForSite(id), `task for ${id}`);
  }
  for (const t of SITE_TASKS) {
    assert.equal(t.quiz.options.length, 3);
    assert.ok([0, 1, 2].includes(t.quiz.correct));
    assert.ok(t.holdSeconds > 0);
  }
  for (const d of ['moon', 'mars'] as const) {
    const ids = OBJECTIVES[d].map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, 'objective ids are unique');
  }
});

test('objectives complete from real actions, in any order, and drive "next objective"', () => {
  const sim = getInitialSimulationState('moon');
  let field = createFieldState();
  const ctx = (completedSites: string[]) => ({ destination: 'moon' as const, sim, field, completedSites });
  assert.equal(objectiveProgress(ctx([])).done, 0);
  assert.equal(nextObjective(ctx([]))?.id, 'eva');
  field = { ...field, flags: { eva_started: true, solar_cleaned: true } };
  assert.equal(nextObjective(ctx([]))?.id, 'sample');
  field = { ...field, samples: ['moon-regolith'] };
  assert.equal(objectiveProgress(ctx(['moon-psr-cold-trap'])).done, 4);
  assert.equal(objectiveStatus(ctx([])).find((o) => o.def.id === 'systems')?.done, false);
  field = { ...field, inspected: ['oxygen', 'water', 'power', 'food', 'radiation'] };
  assert.equal(objectiveStatus(ctx([])).find((o) => o.def.id === 'systems')?.done, true);
  // Mars samples do not count for the Moon objective
  const wrong = { ...createFieldState(), samples: ['mars-rock'] };
  assert.equal(objectiveStatus({ destination: 'moon', sim, field: wrong, completedSites: [] }).find((o) => o.def.id === 'sample')?.done, false);
});

test('mission result: failure, incomplete, and a 3-star success are distinguished', () => {
  const sim = getInitialSimulationState('moon');
  const field = createFieldState();
  const sites = siteIdsFor('moon');
  const base = { destination: 'moon' as const, quizCorrect: [] as string[] };
  assert.equal(computeMissionResult({ ...base, sim: { ...sim, missionStatus: 'critical' }, field, completedSites: [] }).outcome, 'failed');
  assert.equal(computeMissionResult({ ...base, sim, field, completedSites: [] }).outcome, 'incomplete');
  assert.equal(computeMissionResult({ ...base, sim: { ...sim, missionStatus: 'victory', currentSol: 30 }, field: { ...field, crewHealth: 0 }, completedSites: sites }).outcome, 'failed');
  const win = computeMissionResult({ ...base, quizCorrect: sites, sim: { ...sim, missionStatus: 'victory', currentSol: 30 }, field, completedSites: sites });
  assert.equal(win.outcome, 'success');
  assert.equal(win.stars, 3);
  assert.ok(win.xp > 600);
  const thin = computeMissionResult({ ...base, sim: { ...sim, missionStatus: 'victory', currentSol: 30, oxygenLevel: 20 }, field, completedSites: [] });
  assert.equal(thin.stars, 1);
  assert.equal(rankFor(0).title, 'Cadet');
  assert.equal(rankFor(650).level, 2);
  assert.equal(rankFor(1e9).title, 'Artemis Candidate');
});

// ---------- save compatibility ----------
test('save: field + game progress persist per destination; old saves gain defaults', () => {
  const st = mem();
  let save = createNewSave();
  save = { ...save, field: { ...save.field, mars: { ...save.field.mars, foodLevel: 41 } }, game: { ...save.game, xp: 250, quizCorrect: ['moon-apollo-11'] } };
  assert.equal(writeSave(st, save), true);
  const back = loadSave(st);
  assert.equal(back.field.mars.foodLevel, 41);
  assert.equal(back.field.moon.foodLevel, 100, 'Moon and Mars stay separate');
  assert.equal(back.game.xp, 250);
  assert.ok(st.data[SAVE_KEY].includes('"version":2'), 'save format version is unchanged');

  const old = createNewSave() as unknown as Record<string, unknown>;
  delete old.field; delete old.game;
  const migrated = migrateSave(old);
  assert.equal(migrated.game.xp, 0);
  assert.equal(migrated.field.moon.foodLevel, 100);
  assert.equal(migrateSave({ game: { xp: -5, quizCorrect: 'x' }, field: 3 }).game.xp, 0);
});

test('save: restarting one destination leaves the other, achievements and XP alone', () => {
  let save = createNewSave();
  save = completeSiteTask(save, 'moon', 'moon-apollo-11');
  save = completeSiteTask(save, 'mars', 'mars-moxie-station');
  save = { ...save, game: { ...save.game, xp: 300, quizCorrect: ['moon-apollo-11', 'mars-moxie-station'] }, field: { ...save.field, moon: { ...save.field.moon, foodLevel: 3 } } };
  const sim = advanceSolState(save.simulations.moon, 'moon');
  assert.ok(sim);
  save = { ...save, simulations: { ...save.simulations, moon: sim!.state } };
  const reset = resetDestinationProgress(save, 'moon');
  assert.equal(reset.simulations.moon.currentSol, 1);
  assert.equal(reset.field.moon.foodLevel, 100);
  assert.deepEqual(reset.completedSites, ['mars-moxie-station']);
  assert.deepEqual(reset.game.quizCorrect, ['mars-moxie-station']);
  assert.equal(reset.game.xp, 300);
  assert.equal(reset.simulations.mars.currentSol, 1);
});

// ---------- terrain and collision ----------
test('terrain: deterministic, finite everywhere, flat at the base, and Moon/Mars differ', () => {
  for (const d of ['moon', 'mars'] as const) {
    for (let x = -WORLD_HALF; x <= WORLD_HALF; x += 50) {
      for (let z = -WORLD_HALF; z <= WORLD_HALF; z += 50) {
        const h = terrainHeight(d, x, z);
        assert.ok(Number.isFinite(h), `${d} height finite at ${x},${z}`);
        assert.ok(Math.abs(h) < 120, `${d} height sane at ${x},${z}: ${h}`);
        assert.equal(h, terrainHeight(d, x, z));
      }
    }
    assert.equal(terrainHeight(d, 0, 8), 0);
    assert.ok(Math.abs(terrainHeight(d, 0, 14)) < 0.01, 'spawn is on the pad');
  }
  assert.notEqual(moonHeight(120, 90), marsHeight(120, 90));
});

test('terrain: the shadowed crater floor is lower than its rim, and the rim overlook is high', () => {
  const psr = getWorld('moon').craters[0];
  assert.ok(moonHeight(psr.x, psr.z) < moonHeight(psr.x + psr.r * 1.1, psr.z) - 10);
  assert.equal(inColdShadow('moon', psr.x, psr.z), true);
  assert.equal(inColdShadow('moon', 0, 0), false);
  assert.equal(inColdShadow('mars', psr.x, psr.z), false);
  assert.ok(moonHeight(92, 262) > 15, 'Shackleton overlook stands above the plain');
});

test('world: every site lies inside the world on gentle enough ground and none overlap the base', () => {
  for (const d of ['moon', 'mars'] as const) {
    const w = getWorld(d);
    const spots = [...w.sites, { id: w.sampleStation.id, x: w.sampleStation.x, z: w.sampleStation.z, radius: 2 }];
    for (const s of spots) {
      assert.ok(Math.abs(s.x) < WORLD_HALF - 10 && Math.abs(s.z) < WORLD_HALF - 10, `${s.id} inside world`);
      assert.ok(Math.hypot(s.x, s.z) > 25, `${s.id} is away from the habitat`);
    }
    assert.equal(w.sites.length, 4);
  }
});

test('collision: circles and boxes push the player out, and open ground is untouched', () => {
  const cs = baseColliders('moon');
  const out = resolveCollisions(0, 5, 0.45, cs); // inside the habitat circle
  assert.ok(out.hit);
  assert.ok(Math.hypot(out.x - 0, out.z - -1) >= 10 + 0.45 - 1e-6);
  const free = resolveCollisions(60, -60, 0.45, cs);
  assert.equal(free.hit, false);
  assert.deepEqual([free.x, free.z], [60, -60]);
  const boxPush = resolveCollisions(-17, 7.5, 0.4, cs); // the solar array box
  assert.ok(boxPush.hit);
  assert.ok(Math.abs(boxPush.z - 7) >= 1.2 - 1e-6 || Math.abs(boxPush.x - -17) >= 4.6);
  const inside = resolveCollisions(-17, 7, 0.4, cs); // centre of the box: must still be ejected
  assert.ok(inside.hit && (Math.abs(inside.z - 7) >= 1.2 || Math.abs(inside.x + 17) >= 4.6));
  assert.equal(clampToWorld(9999), WORLD_HALF - 6);
});

test('habitat interior: stations are inside the room, reachable, and not buried in colliders', () => {
  for (const s of HABITAT_STATIONS) {
    assert.ok(Math.abs(s.x) <= HABITAT_HALF.x && Math.abs(s.z) <= HABITAT_HALF.z, `${s.id} inside`);
  }
  // The player can stand at each station's approach point (radius 0.45) without being pushed far.
  for (const s of HABITAT_STATIONS) {
    const approach = { x: s.x, z: s.z > 0 ? s.z - 2.2 : s.z + 2.2 };
    if (s.id === 'hydroponics') { approach.x = s.x + 1.6; approach.z = s.z; }
    if (s.id === 'airlock') { approach.x = s.x - 1.6; approach.z = s.z; }
    const r = resolveCollisions(approach.x, approach.z, 0.45, HABITAT_COLLIDERS);
    assert.ok(Math.hypot(r.x - approach.x, r.z - approach.z) < 0.6, `${s.id} approach point is clear`);
  }
});

test('boulders: deterministic, off the base pad, and large ones are solid', () => {
  const a = generateBoulders('moon', 300);
  const b = generateBoulders('moon', 300);
  assert.deepEqual(a, b);
  assert.ok(a.every((r) => Math.hypot(r.x, r.z - 10) >= 24));
  assert.ok(a.some((r) => r.solid));
  assert.ok(a.every((r) => !r.solid || r.scale > 1.2));
});

// ---------- regression guards ----------
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

test('R3F: no useFrame uses a positive priority (that would switch off automatic rendering and freeze the scene)', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles('src/game')) {
    const src = readFileSync(file, 'utf8');
    // matches the closing "}, 1);" style of useFrame(cb, priority)
    const re = /useFrame\(([\s\S]*?)\n\s*\}\s*,\s*(-?\d+)\s*\)/g;
    for (const m of src.matchAll(re)) if (Number(m[2]) > 0) offenders.push(`${file}: useFrame priority ${m[2]}`);
  }
  assert.deepEqual(offenders, []);
});
