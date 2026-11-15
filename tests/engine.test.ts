import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitialSimulationState, computeCalculations, advanceSolState, actions,
} from '../src/engine/simulation.ts';
import { evaluateAchievements, ACHIEVEMENT_IDS } from '../src/engine/achievements.ts';
import { INITIAL_ACHIEVEMENTS } from '../src/data/achievements.ts';
import {
  createNewSave, loadSave, writeSave, migrateSave, SAVE_KEY, SAVE_VERSION, type StorageLike,
} from '../src/engine/save.ts';
import type { HabitatSimulationState } from '../src/types.ts';

function memStorage(seed: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
}

function runToEnd(dest: 'moon' | 'mars', tweak?: (s: HabitatSimulationState) => HabitatSimulationState) {
  let s = getInitialSimulationState(dest);
  if (tweak) s = tweak(s);
  const solsRun: ReturnType<typeof advanceSolState>[] = [];
  for (let i = 0; i < 40; i++) {
    const r = advanceSolState(s, dest);
    if (!r) break;
    solsRun.push(r);
    s = r.state;
  }
  return { final: s, solsRun };
}

test('initial state differs by destination and power balance is correct', () => {
  const moon = computeCalculations(getInitialSimulationState('moon'), 'moon');
  const mars = computeCalculations(getInitialSimulationState('mars'), 'mars');
  assert.equal(moon.totalDemand, 90);
  assert.equal(moon.netPowerKw, 20);
  assert.equal(mars.netPowerKw, 5);
  assert.equal(moon.o2Delta, 1);      // -8 + 9
  assert.equal(moon.waterDelta, -1);  // -8 + 7.36 rounded
});

test('o2 and water equations by mode', () => {
  const base = getInitialSimulationState('moon');
  const eco = computeCalculations({ ...base, o2Mode: 'eco' }, 'moon');
  const boost = computeCalculations({ ...base, o2Mode: 'boost' }, 'moon');
  assert.equal(eco.o2Delta, -2);
  assert.equal(boost.o2Delta, 5);
  const hyper = computeCalculations({ ...base, waterRecyclerMode: 'hyper' }, 'moon');
  assert.equal(hyper.waterDelta, Math.round(-8 + 8 * 0.98));
  const strict = computeCalculations({ ...base, waterRation: 'strict', waterRecyclerMode: 'off' }, 'moon');
  assert.equal(strict.waterDelta, -5);
});

test('advancing a Sol is pure (does not mutate input) and increments the Sol', () => {
  const s = getInitialSimulationState('moon');
  const snapshot = JSON.stringify(s);
  const r = advanceSolState(s, 'moon');
  assert.ok(r);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(r.state.currentSol, 2);
  assert.equal(r.journalEntry.id, 'sol-2-moon');
});

test('finished missions cannot advance; victory and critical are mutually exclusive', () => {
  const { final, solsRun } = runToEnd('moon');
  assert.ok(['victory', 'critical'].includes(final.missionStatus));
  assert.equal(advanceSolState(final, 'moon'), null);
  assert.ok(solsRun.length <= 29);
  // Sol 30 reached with depleted water must NEVER be victory.
  const starved = runToEnd('moon', (s) => ({ ...s, waterLevel: 20, waterRecyclerMode: 'off', waterRation: 'generous' }));
  assert.equal(starved.final.missionStatus, 'critical');
  const entry = starved.solsRun.at(-1)!.journalEntry;
  assert.equal(entry.badge, undefined);
});

test('all outputs stay within physical bounds across a full run on both planets', () => {
  for (const d of ['moon', 'mars'] as const) {
    for (const mode of ['eco', 'standard', 'boost'] as const) {
      const { solsRun } = runToEnd(d, (s) => ({ ...s, o2Mode: mode }));
      for (const r of solsRun) {
        const s = r!.state;
        for (const v of [s.oxygenLevel, s.waterLevel, s.batteryCharge, s.habitatIntegrity, s.solarDustAccumulation]) {
          assert.ok(v >= 0 && v <= 100, `${d}/${mode} value ${v} out of bounds`);
        }
      }
    }
  }
});

test('simulation is deterministic', () => {
  const a = runToEnd('mars').final;
  const b = runToEnd('mars').final;
  assert.deepEqual(a, b);
});

test('moon and mars progress are independent states', () => {
  const save = createNewSave();
  const r = advanceSolState(save.simulations.moon, 'moon')!;
  save.simulations.moon = r.state;
  assert.equal(save.simulations.moon.currentSol, 2);
  assert.equal(save.simulations.mars.currentSol, 1);
});

test('emergency canister and ice smelter actions', () => {
  const s = getInitialSimulationState('moon');
  const used = actions.useEmergencyO2Canister({ ...s, oxygenLevel: 60 });
  assert.equal(used.oxygenLevel, 85);
  assert.equal(used.emergencyO2Canisters, 1);
  assert.equal(actions.useEmergencyO2Canister({ ...s, emergencyO2Canisters: 0 }).oxygenLevel, s.oxygenLevel);
  const on = actions.toggleIceSmelting(s);
  assert.equal(on.powerAllocation.iceSmelting, true);
  assert.equal(computeCalculations(on, 'moon').totalDemand, 105);
});

test('every achievement rule id exists in the achievement data (no missing IDs)', () => {
  const ids = new Set(INITIAL_ACHIEVEMENTS.map((a) => a.id));
  for (const id of ACHIEVEMENT_IDS) assert.ok(ids.has(id), `missing achievement data for ${id}`);
  for (const id of ids) assert.ok((ACHIEVEMENT_IDS as readonly string[]).includes(id), `no rule for ${id}`);
});

test('achievements require real events, not clicks', () => {
  // Clicking a setting is not an event at all; only Sol results count.
  const { solsRun } = runToEnd('moon');
  const first = evaluateAchievements({ type: 'sol_completed', facts: solsRun[0]!.facts });
  assert.ok(first.some((a) => a.id === 'oxygen_master') === (solsRun[0]!.facts.oxygen > 90));
  assert.deepEqual(evaluateAchievements({ type: 'solar_cleaned', dustBefore: 4 }), []);
  assert.deepEqual(evaluateAchievements({ type: 'solar_cleaned', dustBefore: 10 }).map((a) => a.id), ['solar_engineer']);
  assert.deepEqual(
    evaluateAchievements({ type: 'site_task_completed', destination: 'moon', completedSiteIds: ['a'], allSiteIds: ['a', 'b'] }),
    [],
  );
  assert.deepEqual(
    evaluateAchievements({ type: 'site_task_completed', destination: 'moon', completedSiteIds: ['a', 'b'], allSiteIds: ['a', 'b'] }).map((a) => a.id),
    ['planetary_geologist'],
  );
});

test('mission_graduate only on genuine Sol 30 victory; midway needs healthy reserves', () => {
  const { solsRun } = runToEnd('moon');
  const last = solsRun.at(-1)!;
  const got = evaluateAchievements({ type: 'sol_completed', facts: last.facts }).map((a) => a.id);
  assert.equal(got.includes('mission_graduate'), last.facts.status === 'victory' && last.facts.sol === 30);
  const weak = { ...solsRun[0]!.facts, sol: 15, oxygen: 40, water: 80, integrity: 90, status: 'active' as const };
  assert.ok(!evaluateAchievements({ type: 'sol_completed', facts: weak }).some((a) => a.id === 'midway_explorer'));
  assert.ok(evaluateAchievements({ type: 'sol_completed', facts: { ...weak, oxygen: 60 } }).some((a) => a.id === 'midway_explorer'));
});

test('save round-trips and persists journal + both simulations', () => {
  const st = memStorage();
  const save = createNewSave();
  const r = advanceSolState(save.simulations.mars, 'mars')!;
  save.simulations.mars = r.state;
  save.journals.mars = [r.journalEntry];
  save.achievements['ice_miner'] = { unlockedAtSol: 3 };
  assert.ok(writeSave(st, save));
  const back = loadSave(st);
  assert.equal(back.version, SAVE_VERSION);
  assert.equal(back.simulations.mars.currentSol, 2);
  assert.equal(back.simulations.moon.currentSol, 1);
  assert.equal(back.journals.mars[0].id, 'sol-2-mars');
  assert.deepEqual(back.achievements.ice_miner, { unlockedAtSol: 3 });
});

test('legacy v1 keys migrate; pre-unlocked first_touchdown is not trusted', () => {
  const st = memStorage({
    buildscapes_achievements: JSON.stringify([
      { id: 'first_touchdown', unlocked: true, unlockedAtSol: 1 },
      { id: 'ice_miner', unlocked: true, unlockedAtSol: 4 },
      { id: 'solar_engineer', unlocked: false },
    ]),
    buildscapes_explored_sites: JSON.stringify(['moon-apollo-11']),
  });
  const s = loadSave(st);
  assert.deepEqual(Object.keys(s.achievements), ['ice_miner']);
  assert.deepEqual(s.viewedSites, ['moon-apollo-11']);
  assert.deepEqual(s.completedSites, []);
});

test('corrupt or hostile saves never throw and fall back to defaults', () => {
  for (const raw of ['{not json', 'null', '42', '"x"', '[]', '{"simulations":{"moon":{"currentSol":"x"}}}']) {
    const s = loadSave(memStorage({ [SAVE_KEY]: raw }));
    assert.equal(s.simulations.moon.currentSol, 1);
  }
  assert.equal(migrateSave(undefined).version, SAVE_VERSION);
  const throwing: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.equal(writeSave(throwing, createNewSave()), false);
});
