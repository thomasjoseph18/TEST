// Differential regression: the ORIGINAL hook (from main) vs the extracted pure engine.
// Same random action sequences, both destinations; full state + journal must be identical.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHook } from './fixtures/react-stub.ts';
import { useHabitatSimulation as originalHook } from './fixtures/original-hook.ts';
import { actions, advanceSolState, computeCalculations, getInitialSimulationState } from '../src/engine/simulation.ts';
import type { Destination, HabitatSimulationState, JournalEntry, PowerAllocation } from '../src/types.ts';

function rng(seed: number) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];
const POWER_KEYS: (keyof PowerAllocation)[] = ['lifeSupportO2', 'waterRecycling', 'thermalRegulation', 'scienceLab', 'communications', 'iceSmelting'];

for (const dest of ['moon', 'mars'] as Destination[]) {
  test(`original hook == pure engine over 60 random 30-Sol runs (${dest})`, () => {
    let compared = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed * 7919);
      const journal: JournalEntry[] = [];
      const h = renderHook(() => originalHook(dest, (e) => journal.push(e), undefined));
      let mine: HabitatSimulationState = getInitialSimulationState(dest);
      const myJournal: JournalEntry[] = [];
      assert.deepEqual(h.current.state, mine);

      for (let step = 0; step < 90; step++) {
        const roll = r();
        if (roll < 0.35) {
          h.act((x) => x.advanceSol());
          const res = advanceSolState(mine, dest);
          if (res) { mine = res.state; myJournal.push(res.journalEntry); }
        } else if (roll < 0.45) {
          const m = pick(r, ['eco', 'standard', 'boost'] as const);
          h.act((x) => x.setO2Mode(m)); mine = { ...mine, o2Mode: m };
        } else if (roll < 0.55) {
          const m = pick(r, ['off', 'basic', 'advanced', 'hyper'] as const);
          h.act((x) => x.setWaterRecyclerMode(m)); mine = { ...mine, waterRecyclerMode: m };
        } else if (roll < 0.63) {
          const m = pick(r, ['strict', 'standard', 'generous'] as const);
          h.act((x) => x.setWaterRation(m)); mine = { ...mine, waterRation: m };
        } else if (roll < 0.72) {
          h.act((x) => x.toggleIceSmelting()); mine = actions.toggleIceSmelting(mine);
        } else if (roll < 0.84) {
          const k = pick(r, POWER_KEYS);
          h.act((x) => x.togglePowerAllocation(k)); mine = actions.togglePowerAllocation(mine, k);
        } else if (roll < 0.92) {
          h.act((x) => x.cleanSolarPanels()); mine = actions.cleanSolarPanels(mine);
        } else {
          h.act((x) => x.useEmergencyO2Canister()); mine = actions.useEmergencyO2Canister(mine);
        }
        assert.deepEqual(h.current.state, mine, `state diverged: ${dest} seed ${seed} step ${step}`);
        assert.deepEqual(h.current.calculations, computeCalculations(mine, dest), `calculations diverged: ${dest} seed ${seed} step ${step}`);
        compared++;
      }
      assert.deepEqual(journal, myJournal, `journal diverged: ${dest} seed ${seed}`);
    }
    assert.equal(compared, 60 * 90);
  });
}

// ---- The NEW React hook (ref-based) must also match the pure engine, including same-tick batches. ----
import { useHabitatSimulation as newHook } from '../src/hooks/useHabitatSimulation.ts';
import type { GameEvent } from '../src/engine/achievements.ts';

for (const dest of ['moon', 'mars'] as Destination[]) {
  test(`new hook == pure engine, including several actions in one tick (${dest})`, () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = rng(seed * 104729);
      const events: GameEvent[] = [];
      const journal: JournalEntry[] = [];
      const h = renderHook(() => newHook(dest, { onJournalAdd: (e) => journal.push(e), onGameEvent: (e) => events.push(e) }));
      let mine = getInitialSimulationState(dest);
      const myJournal: JournalEntry[] = [];
      for (let step = 0; step < 40; step++) {
        // 1-3 actions inside ONE act(): no re-render between them
        const batch = 1 + Math.floor(r() * 3);
        const ops: Array<(x: ReturnType<typeof newHook>) => void> = [];
        for (let b = 0; b < batch; b++) {
          const roll = r();
          if (roll < 0.3) { ops.push((x) => x.advanceSol()); const res = advanceSolState(mine, dest); if (res) { mine = res.state; myJournal.push(res.journalEntry); } }
          else if (roll < 0.5) { const m = pick(r, ['eco', 'standard', 'boost'] as const); ops.push((x) => x.setO2Mode(m)); mine = { ...mine, o2Mode: m }; }
          else if (roll < 0.7) { const k = pick(r, POWER_KEYS); ops.push((x) => x.togglePowerAllocation(k)); mine = actions.togglePowerAllocation(mine, k); }
          else if (roll < 0.85) { ops.push((x) => x.toggleIceSmelting()); mine = actions.toggleIceSmelting(mine); }
          else { ops.push((x) => x.cleanSolarPanels()); mine = actions.cleanSolarPanels(mine); }
        }
        h.act((x) => ops.forEach((op) => op(x)));
        assert.deepEqual(h.current.state, mine, `new hook diverged: ${dest} seed ${seed} step ${step}`);
      }
      assert.deepEqual(journal, myJournal);
      // reset only restarts the active destination's state
      h.act((x) => x.resetSimulation());
      assert.deepEqual(h.current.state, getInitialSimulationState(dest));
    }
  });
}

test('new hook keeps Moon and Mars independent when the destination changes', () => {
  let dest: Destination = 'moon';
  const h = renderHook(() => newHook(dest));
  h.act((x) => { x.advanceSol(); x.advanceSol(); });
  assert.equal(h.current.state.currentSol, 3);
  const moonAfter = h.current.state;
  dest = 'mars';
  h.rerender();
  assert.equal(h.current.state.currentSol, 1, 'Mars starts fresh');
  h.act((x) => x.advanceSol());
  assert.equal(h.current.state.currentSol, 2);
  dest = 'moon';
  h.rerender();
  assert.deepEqual(h.current.state, moonAfter, 'Moon progress survived the switch');
});
