// Pure simulation engine for the 30-Sol habitat trainer.
// Extracted from useHabitatSimulation.ts. Equations are intentionally UNCHANGED.
// No React, no DOM: safe to unit-test in Node.
import type {
  Destination,
  HabitatSimulationState,
  JournalEntry,
  MissionStatus,
  PowerAllocation,
} from '../types.ts';
import { getDailySolEvent } from '../data/solEvents.ts';

export const INITIAL_POWER_ALLOCATION: PowerAllocation = {
  lifeSupportO2: true,
  waterRecycling: true,
  thermalRegulation: true,
  scienceLab: true,
  communications: true,
  iceSmelting: false,
};

export function baseSolarFor(destination: Destination): number {
  return destination === 'mars' ? 95 : 110;
}

export function getInitialSimulationState(destination: Destination): HabitatSimulationState {
  const isMars = destination === 'mars';
  const baseSolar = baseSolarFor(destination);
  const initialDemand = 90; // 25 + 20 + 20 + 15 + 10
  return {
    currentSol: 1,
    totalSols: 30,
    missionStatus: 'active',
    oxygenLevel: 98,
    o2Mode: 'standard',
    o2ScrubberEfficiency: 96,
    emergencyO2Canisters: 2,
    netO2Delta: 1,
    waterLevel: 96,
    waterRecyclerMode: 'advanced',
    waterRation: 'standard',
    iceSmeltingActive: false,
    iceReservesKg: 300,
    netWaterDelta: -1,
    batteryCharge: 100,
    solarDustAccumulation: 0,
    powerAllocation: { ...INITIAL_POWER_ALLOCATION },
    totalPowerGeneratedKw: baseSolar,
    totalPowerDemandKw: initialDemand,
    batteryDeltaKw: baseSolar - initialDemand,
    habitatTempC: 21,
    habitatIntegrity: 100,
    currentEvent: getDailySolEvent(destination, 1),
    lastDebriefMessage: isMars
      ? 'Sol 1 initialized. Ares Jezero Biosphere environmental loops connected. All life support systems nominal.'
      : 'Sol 1 initialized. Shackleton Base Camp environmental loops connected. All life support systems nominal.',
  };
}

export interface SimulationCalculations {
  powerGenerated: number;
  totalDemand: number;
  netPowerKw: number;
  o2Delta: number;
  waterDelta: number;
}

export function computeCalculations(
  state: HabitatSimulationState,
  destination: Destination,
): SimulationCalculations {
  const baseSolar = baseSolarFor(destination);
  const dustPenalty = Math.max(0.2, (100 - state.solarDustAccumulation * 0.45) / 100);
  const eventMod = state.currentEvent.solarModifier;
  const powerGenerated = Math.max(0, Math.round(baseSolar * dustPenalty * eventMod));

  let o2Demand = state.powerAllocation.lifeSupportO2 ? 25 : 0;
  if (state.o2Mode === 'boost') o2Demand += 10;
  if (state.o2Mode === 'eco') o2Demand = Math.max(10, o2Demand - 10);

  let waterDemand = 0;
  if (state.powerAllocation.waterRecycling) {
    if (state.waterRecyclerMode === 'basic') waterDemand = 10;
    else if (state.waterRecyclerMode === 'advanced') waterDemand = 20;
    else if (state.waterRecyclerMode === 'hyper') waterDemand = 30;
  }

  const thermalDemand = state.powerAllocation.thermalRegulation
    ? 20 + state.currentEvent.thermalModifierKw
    : 0;
  const scienceDemand = state.powerAllocation.scienceLab ? 15 : 0;
  const commsDemand = state.powerAllocation.communications ? 10 : 0;
  const iceDemand = state.powerAllocation.iceSmelting && state.iceSmeltingActive ? 15 : 0;

  const totalDemand = o2Demand + waterDemand + thermalDemand + scienceDemand + commsDemand + iceDemand;
  const netPowerKw = powerGenerated - totalDemand;

  let o2Delta = -8;
  if (state.powerAllocation.lifeSupportO2 && (state.batteryCharge > 0 || netPowerKw >= 0)) {
    if (state.o2Mode === 'eco') o2Delta += 6;
    else if (state.o2Mode === 'standard') o2Delta += 9;
    else if (state.o2Mode === 'boost') o2Delta += 13;
  }

  let waterConsumed = -8;
  if (state.waterRation === 'strict') waterConsumed = -5;
  if (state.waterRation === 'generous') waterConsumed = -12;

  let waterRecovered = 0;
  if (state.powerAllocation.waterRecycling && (state.batteryCharge > 0 || netPowerKw >= 0)) {
    if (state.waterRecyclerMode === 'basic') waterRecovered = Math.abs(waterConsumed) * 0.75;
    else if (state.waterRecyclerMode === 'advanced') waterRecovered = Math.abs(waterConsumed) * 0.92;
    else if (state.waterRecyclerMode === 'hyper') waterRecovered = Math.abs(waterConsumed) * 0.98;
  }

  let iceWaterGained = 0;
  if (state.iceSmeltingActive && state.powerAllocation.iceSmelting && state.iceReservesKg > 0) {
    iceWaterGained = 7;
  }

  const waterDelta = Math.round(waterConsumed + waterRecovered + iceWaterGained);
  return { powerGenerated, totalDemand, netPowerKw, o2Delta, waterDelta };
}

export interface AdvanceResult {
  state: HabitatSimulationState;
  journalEntry: JournalEntry;
  /** Raw facts about this Sol, used by the achievement evaluator. */
  facts: SolFacts;
}

export interface SolFacts {
  sol: number;
  destination: Destination;
  status: MissionStatus;
  oxygen: number;
  water: number;
  battery: number;
  integrity: number;
  netPowerKw: number;
  o2Mode: HabitatSimulationState['o2Mode'];
  waterRecyclerMode: HabitatSimulationState['waterRecyclerMode'];
  essentialsPowered: boolean;
}

/** Returns null when the mission is already finished (advance is a no-op). */
export function advanceSolState(
  state: HabitatSimulationState,
  destination: Destination,
): AdvanceResult | null {
  if (state.missionStatus === 'critical' || state.missionStatus === 'victory') return null;
  if (state.currentSol >= state.totalSols) return null;

  const calculations = computeCalculations(state, destination);
  const nextSol = state.currentSol + 1;
  const event = getDailySolEvent(destination, nextSol);

  let newBattery: number;
  if (calculations.netPowerKw >= 0) {
    newBattery = Math.min(100, Math.round(state.batteryCharge + calculations.netPowerKw * 0.35));
  } else {
    newBattery = Math.max(0, Math.round(state.batteryCharge + calculations.netPowerKw * 0.6));
  }

  let newO2 = Math.min(100, Math.max(0, state.oxygenLevel + calculations.o2Delta));
  let emergencyTriggered = false;
  let remainingCanisters = state.emergencyO2Canisters;
  if (newO2 < 15 && remainingCanisters > 0) {
    newO2 = Math.min(100, newO2 + 25);
    remainingCanisters -= 1;
    emergencyTriggered = true;
  }

  const newWater = Math.min(100, Math.max(0, state.waterLevel + calculations.waterDelta));

  let newIce = state.iceReservesKg;
  if (state.iceSmeltingActive && state.powerAllocation.iceSmelting && newIce >= 50) newIce -= 50;

  const newDust = Math.min(85, state.solarDustAccumulation + event.dustAccumulation);

  const isHeated =
    state.powerAllocation.thermalRegulation && (newBattery > 0 || calculations.netPowerKw >= 0);
  const minAmbientTemp = destination === 'mars' ? -40 : -65;
  let newTemp = state.habitatTempC;
  if (isHeated) {
    newTemp = newTemp < 21 ? Math.min(21, newTemp + 8) : 21;
  } else {
    const coolingDrop = 8 + Math.round(event.thermalModifierKw / 2);
    newTemp = Math.max(minAmbientTemp, newTemp - coolingDrop);
  }

  let integrityDelta = 0;
  if (newTemp >= 18 && newO2 >= 40) {
    if (state.habitatIntegrity < 100) integrityDelta = +1;
  } else if (newTemp < 0 && newTemp >= -15) {
    integrityDelta = -3;
  } else if (newTemp < -15) {
    integrityDelta = -6;
  } else if (newTemp < 10) {
    integrityDelta = -1;
  }
  if (newO2 < 20) integrityDelta -= 2;
  const newIntegrity = Math.min(100, Math.max(0, state.habitatIntegrity + integrityDelta));

  let newStatus: MissionStatus = 'active';
  if (newO2 <= 5 || newWater <= 5 || newIntegrity <= 10) {
    newStatus = 'critical';
  } else if (nextSol >= 30) {
    newStatus = newO2 > 15 && newWater > 15 && newIntegrity > 25 ? 'victory' : 'critical';
  }

  let debrief = `Sol ${nextSol} Operations Complete. `;
  if (newStatus === 'critical') {
    debrief += `⚠️ MISSION FAILED: Life-support reserves or habitat hull integrity reached critical limits. Reset required.`;
  } else if (newStatus === 'victory') {
    debrief += `🏆 30-SOL MISSION ACCOMPLISHED! Outstanding leadership, Junior Commander! You have successfully mastered 30 Sols on ${destination === 'mars' ? 'Mars' : 'the Moon'}.`;
  } else {
    if (emergencyTriggered) debrief += `⚠️ Emergency O₂ auto-injected! `;
    if (calculations.netPowerKw < 0) debrief += `Batteries supplied ${Math.abs(calculations.netPowerKw)} kW of power. `;
    else debrief += `Solar surplus: +${calculations.netPowerKw} kW. `;
    debrief += `O₂ is at ${newO2}%, Water is at ${newWater}%, Batteries at ${newBattery}%, Temp at ${newTemp}°C.`;
  }

  const next: HabitatSimulationState = {
    currentSol: nextSol,
    totalSols: state.totalSols,
    missionStatus: newStatus,
    oxygenLevel: newO2,
    o2Mode: state.o2Mode,
    o2ScrubberEfficiency: state.o2ScrubberEfficiency,
    emergencyO2Canisters: remainingCanisters,
    netO2Delta: calculations.o2Delta,
    waterLevel: newWater,
    waterRecyclerMode: state.waterRecyclerMode,
    waterRation: state.waterRation,
    iceSmeltingActive: state.iceSmeltingActive,
    iceReservesKg: newIce,
    netWaterDelta: calculations.waterDelta,
    batteryCharge: newBattery,
    solarDustAccumulation: newDust,
    powerAllocation: state.powerAllocation,
    totalPowerGeneratedKw: calculations.powerGenerated,
    totalPowerDemandKw: calculations.totalDemand,
    batteryDeltaKw: calculations.netPowerKw,
    habitatTempC: newTemp,
    habitatIntegrity: newIntegrity,
    currentEvent: event,
    lastDebriefMessage: debrief,
  };

  let journalTitle = `Sol ${nextSol} Field Operations & Resource Log`;
  let badge: JournalEntry['badge'];
  const outcomeStatus: JournalEntry['outcomeStatus'] =
    newStatus === 'active'
      ? newIntegrity < 50 || newO2 < 25 || newWater < 25 ? 'warning' : 'nominal'
      : newStatus;

  if (nextSol === 30) {
    if (newStatus === 'victory') {
      journalTitle = 'Sol 30 Milestone: 30-Sol Mission Accomplished!';
      badge = {
        name: 'Senior Astronaut 30-Sol Wings',
        icon: 'Award',
        description: 'Mastered all 30 Sols of habitat survival on a foreign planetary world!',
      };
    } else {
      journalTitle = 'Sol 30 Critical Report: Mission Failed';
    }
  } else if (nextSol === 15 && newStatus !== 'critical') {
    badge = {
      name: 'Halfway Pioneer Pin',
      icon: 'Rocket',
      description: 'Successfully reached Sol 15 with nominal life-support reserves.',
    };
  }

  const journalEntry: JournalEntry = {
    id: `sol-${nextSol}-${destination}`,
    sol: nextSol,
    title: journalTitle,
    author: 'Junior Commander (Flight Ops)',
    timestamp: `Sol ${nextSol} / 30 - ${destination === 'mars' ? 'Martian Solar Time' : 'Lunar Mission Time'}`,
    body: `Day summary: ${event.title}. ${debrief} Habitat environmental systems operating at ${newTemp}°C with ${newIntegrity}% structural integrity.`,
    resourceSummary: { o2: newO2, water: newWater, power: newBattery, temp: newTemp, integrity: newIntegrity },
    playerActionTaken: `O₂: ${state.o2Mode} | Water: ${state.waterRecyclerMode} | Ration: ${state.waterRation}`,
    scientificLearningPoint: event.scientificConcept,
    outcomeStatus,
    scienceTip: event.tip,
    badge,
  };

  const p = state.powerAllocation;
  const facts: SolFacts = {
    sol: nextSol,
    destination,
    status: newStatus,
    oxygen: newO2,
    water: newWater,
    battery: newBattery,
    integrity: newIntegrity,
    netPowerKw: calculations.netPowerKw,
    o2Mode: state.o2Mode,
    waterRecyclerMode: state.waterRecyclerMode,
    essentialsPowered: p.lifeSupportO2 && p.waterRecycling && p.thermalRegulation,
  };

  return { state: next, journalEntry, facts };
}

// ---- Pure action reducers (state in, state out) ----
export const actions = {
  cleanSolarPanels(prev: HabitatSimulationState): HabitatSimulationState {
    return {
      ...prev,
      solarDustAccumulation: 0,
      lastDebriefMessage: 'Solar array wipers activated! Dust cleared—solar collection efficiency restored to 100%.',
    };
  },
  useEmergencyO2Canister(prev: HabitatSimulationState): HabitatSimulationState {
    if (prev.emergencyO2Canisters <= 0 || prev.missionStatus !== 'active') return prev;
    return {
      ...prev,
      oxygenLevel: Math.min(100, prev.oxygenLevel + 25),
      emergencyO2Canisters: prev.emergencyO2Canisters - 1,
      lastDebriefMessage: 'Emergency O₂ Canister released! +25% pressurized Oxygen added to habitat atmosphere.',
    };
  },
  toggleIceSmelting(prev: HabitatSimulationState): HabitatSimulationState {
    const next = !prev.iceSmeltingActive;
    return {
      ...prev,
      iceSmeltingActive: next,
      powerAllocation: { ...prev.powerAllocation, iceSmelting: next },
    };
  },
  togglePowerAllocation(prev: HabitatSimulationState, key: keyof PowerAllocation): HabitatSimulationState {
    return { ...prev, powerAllocation: { ...prev.powerAllocation, [key]: !prev.powerAllocation[key] } };
  },
};
