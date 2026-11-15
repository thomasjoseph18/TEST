export type NavTab = 'home' | 'missions' | 'habitat' | 'exploration' | 'journal' | 'achievements' | 'settings' | 'lunar-pov' | 'mars-pov';

export type Destination = 'moon' | 'mars';

export type MissionStatus = 'active' | 'victory' | 'critical';

export interface MissionInfo {
  id: Destination;
  name: string;
  tagline: string;
  location: string;
  era: string;
  gravity: string;
  dayLength: string;
  atmosphere: string;
  tempRange: string;
  targetSols: number;
  primaryObjective: string;
  historyNote: string;
  cadetLevel: string;
  colorScheme: {
    primary: string;
    border: string;
    glow: string;
    badge: string;
  };
}

export type O2Mode = 'eco' | 'standard' | 'boost';
export type WaterRecyclerMode = 'off' | 'basic' | 'advanced' | 'hyper';
export type WaterRation = 'strict' | 'standard' | 'generous';

export interface PowerAllocation {
  lifeSupportO2: boolean;      // 25 kW (Essential)
  waterRecycling: boolean;     // 20 kW
  thermalRegulation: boolean;  // 20 kW
  scienceLab: boolean;         // 15 kW
  communications: boolean;     // 10 kW
  iceSmelting: boolean;        // 15 kW
}

export interface SolDailyEvent {
  title: string;
  description: string;
  scenario: string; // Educational scenario
  scientificConcept: string; // Real scientific concept
  recommendedAction: string; // Recommended player strategy
  decisionImpact: string; // What will happen
  solarModifier: number; // Multiplier on solar, e.g. 0.7 during dust
  thermalModifierKw: number; // Extra kW needed if cold
  dustAccumulation: number; // Deterministic % dust added on this Sol
  tip: string; // NOVA tip
}

export interface HabitatSimulationState {
  currentSol: number;
  totalSols: number;
  missionStatus: MissionStatus;
  
  // 1. Oxygen Subsystem
  oxygenLevel: number; // 0 - 100 %
  o2Mode: O2Mode;
  o2ScrubberEfficiency: number; // percentage
  emergencyO2Canisters: number; // count
  netO2Delta: number; // % per Sol
  
  // 2. Water Subsystem
  waterLevel: number; // 0 - 100 %
  waterRecyclerMode: WaterRecyclerMode;
  waterRation: WaterRation;
  iceSmeltingActive: boolean;
  iceReservesKg: number;
  netWaterDelta: number; // % per Sol
  
  // 3. Electrical Power Subsystem
  batteryCharge: number; // 0 - 100 %
  solarDustAccumulation: number; // 0 - 100 %
  powerAllocation: PowerAllocation;
  totalPowerGeneratedKw: number;
  totalPowerDemandKw: number;
  batteryDeltaKw: number;
  
  // Environmental
  habitatTempC: number;
  habitatIntegrity: number;
  
  // Sol Briefing / History
  currentEvent: SolDailyEvent;
  lastDebriefMessage: string;
}

export interface SolTelemetry {
  currentSol: number;
  totalSols: number;
  oxygenLevel: number;
  waterLevel: number;
  powerLevel: number;
  habitatTempC: number;
  habitatIntegrity: number;
  statusMessage: string;
}

export interface JournalEntry {
  id: string;
  sol: number;
  title: string;
  author: string;
  timestamp: string;
  body: string;
  resourceSummary?: {
    o2: number;
    water: number;
    power: number;
    temp: number;
    integrity: number;
  };
  playerActionTaken?: string;
  scientificLearningPoint?: string;
  outcomeStatus?: 'nominal' | 'warning' | 'critical' | 'victory';
  badge?: {
    name: string;
    icon: string;
    description: string;
  };
  scienceTip: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'survival' | 'engineering' | 'exploration' | 'milestone';
  icon: string;
  unlocked: boolean;
  unlockedAtSol?: number;
  criteria: string;
  educationalFact: string;
}

export interface ExplorationPoint {
  id: string;
  destination: Destination;
  title: string;
  subtitle: string;
  coordinates: string;
  description: string;
  scientificSignificance: string;
  nasaConnection: string;
  interactiveFact: string;
  badgeName?: string;
  icon: string;
}

export type UiMode = 'game' | 'classic';

export interface SettingsConfig {
  callSign: string;
  audioEnabled: boolean;
  novaVoiceEnabled: boolean;
  textSize: 'normal' | 'large';
  /** Performance mode for weaker hardware (lower DPR, fewer effects). */
  lowPerformanceMode: boolean;
  /** Reduce camera shake, flashing and non-essential animation. */
  reducedMotion: boolean;
  /** Show captions for radio chatter, NOVA and cinematics. */
  captionsEnabled: boolean;
  /** 0 - 1 master volume for the (future) audio engine. */
  masterVolume: number;
  /** 'classic' = original dashboard app (temporary); 'game' = first-person game shell. */
  uiMode: UiMode;
}
