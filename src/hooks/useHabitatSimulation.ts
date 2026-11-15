import { useState, useCallback, useMemo, useRef } from 'react';
import type {
  Destination,
  HabitatSimulationState,
  O2Mode,
  WaterRecyclerMode,
  WaterRation,
  PowerAllocation,
  JournalEntry,
} from '../types';
import {
  actions,
  advanceSolState,
  computeCalculations,
  getInitialSimulationState,
} from '../engine/simulation';
import type { GameEvent } from '../engine/achievements';
import { drawFromHabitat } from '../engine/field';

export type SimulationMap = Record<Destination, HabitatSimulationState>;

/**
 * React wrapper around the pure simulation engine (src/engine/simulation.ts).
 * - Moon and Mars keep INDEPENDENT progress: switching destination never resets either.
 * - Every action reads the latest state from a ref that is updated synchronously, so several
 *   actions fired in the same tick (e.g. from in-world controls) never overwrite each other.
 * - Achievements are emitted only as real game events (see engine/achievements.ts).
 */
export function useHabitatSimulation(
  destination: Destination,
  options: {
    initialSimulations?: SimulationMap;
    onSimulationsChange?: (sims: SimulationMap) => void;
    onJournalAdd?: (entry: JournalEntry, destination: Destination) => void;
    onGameEvent?: (event: GameEvent) => void;
  } = {},
) {
  const { initialSimulations, onSimulationsChange, onJournalAdd, onGameEvent } = options;

  const [sims, setSims] = useState<SimulationMap>(
    () =>
      initialSimulations ?? {
        moon: getInitialSimulationState('moon'),
        mars: getInitialSimulationState('mars'),
      },
  );
  const simsRef = useRef<SimulationMap>(sims);

  const state = sims[destination];

  /** Apply a pure transition to the active destination only. Returns the new state. */
  const update = useCallback(
    (fn: (prev: HabitatSimulationState) => HabitatSimulationState): HabitatSimulationState => {
      const prev = simsRef.current[destination];
      const next = fn(prev);
      if (next === prev) return prev;
      const merged = { ...simsRef.current, [destination]: next };
      simsRef.current = merged;
      setSims(merged);
      onSimulationsChange?.(merged);
      return next;
    },
    [destination, onSimulationsChange],
  );

  const calculations = useMemo(() => computeCalculations(state, destination), [state, destination]);

  const setO2Mode = useCallback((mode: O2Mode) => { update((p) => ({ ...p, o2Mode: mode })); }, [update]);

  const setWaterRecyclerMode = useCallback(
    (mode: WaterRecyclerMode) => { update((p) => ({ ...p, waterRecyclerMode: mode })); },
    [update],
  );

  const setWaterRation = useCallback(
    (ration: WaterRation) => { update((p) => ({ ...p, waterRation: ration })); },
    [update],
  );

  const toggleIceSmelting = useCallback(() => {
    const next = update(actions.toggleIceSmelting);
    if (next.iceSmeltingActive) onGameEvent?.({ type: 'ice_smelter_started' });
  }, [update, onGameEvent]);

  const togglePowerAllocation = useCallback(
    (key: keyof PowerAllocation) => { update((p) => actions.togglePowerAllocation(p, key)); },
    [update],
  );

  const cleanSolarPanels = useCallback(() => {
    const dustBefore = simsRef.current[destination].solarDustAccumulation;
    update(actions.cleanSolarPanels);
    onGameEvent?.({ type: 'solar_cleaned', dustBefore });
  }, [update, destination, onGameEvent]);

  const useEmergencyO2Canister = useCallback(() => { update(actions.useEmergencyO2Canister); }, [update]);

  /** Returns the new state, or null when the mission is already finished. */
  const advanceSol = useCallback((): HabitatSimulationState | null => {
    const result = advanceSolState(simsRef.current[destination], destination);
    if (!result) return null;
    update(() => result.state);
    onGameEvent?.({ type: 'sol_completed', facts: result.facts });
    onJournalAdd?.(result.journalEntry, destination);
    return result.state;
  }, [update, destination, onGameEvent, onJournalAdd]);

  /** Latest state of the active destination, read from the synchronous ref (safe inside frame loops). */
  const getState = useCallback((): HabitatSimulationState => simsRef.current[destination], [destination]);

  /** The game layer spends habitat oxygen / battery (refilling a suit, charging the rover). */
  const drawResources = useCallback(
    (cost: { oxygen: number; battery: number }) => { update((p) => drawFromHabitat(p, cost)); },
    [update],
  );

  /** Restarts ONLY the active destination. */
  const resetSimulation = useCallback(() => {
    update(() => getInitialSimulationState(destination));
  }, [update, destination]);

  return {
    state,
    simulations: sims,
    calculations,
    setO2Mode,
    setWaterRecyclerMode,
    setWaterRation,
    toggleIceSmelting,
    togglePowerAllocation,
    cleanSolarPanels,
    useEmergencyO2Canister,
    advanceSol,
    getState,
    drawResources,
    resetSimulation,
  };
}
