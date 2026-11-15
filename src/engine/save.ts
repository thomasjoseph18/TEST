// Versioned save system. Pure: storage is injected so it can be tested in Node.
import type { Destination, HabitatSimulationState, JournalEntry, SettingsConfig } from '../types.ts';
import { defaultSettings, sanitizeSettings } from './settings.ts';
import { getInitialSimulationState } from './simulation.ts';
import { createFieldState, sanitizeField, type FieldState } from './field.ts';

export const SAVE_KEY = 'buildscapes_save';
export const SAVE_VERSION = 2;
const LEGACY_ACHIEVEMENTS_KEY = 'buildscapes_achievements';
const LEGACY_EXPLORED_KEY = 'buildscapes_explored_sites';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** Progress that belongs to the first-person game layer (additive: older saves simply gain defaults). */
export interface GameProgress {
  xp: number;
  /** Site ids whose cadet quiz was answered correctly. */
  quizCorrect: string[];
  /** Site ids whose cadet quiz was answered at all (correct or not). */
  quizAnswered: string[];
  /** Finished missions (set when the debrief is shown after success). */
  missionsCompleted: Record<Destination, boolean>;
  /** The player has read the Artemis briefing (only reachable after Moon and Mars are complete). */
  artemisBriefingSeen: boolean;
}

export function createGameProgress(): GameProgress {
  return { xp: 0, quizCorrect: [], quizAnswered: [], missionsCompleted: { moon: false, mars: false }, artemisBriefingSeen: false };
}

export interface SaveGame {
  version: number;
  /** Independent progress per destination. Switching destination never resets either. */
  simulations: Record<Destination, HabitatSimulationState>;
  journals: Record<Destination, JournalEntry[]>;
  achievements: Record<string, { unlockedAtSol?: number }>;
  /** Sites whose science task was completed (not merely viewed). */
  completedSites: string[];
  /** Sites the player has viewed in the classic Exploration screen (informational only). */
  viewedSites: string[];
  progress: { moonTrainingComplete: boolean; introSeen: boolean };
  settings: SettingsConfig;
  /** Suit, rover, radiation, food and crew state per destination (Moon and Mars stay separate). */
  field: Record<Destination, FieldState>;
  game: GameProgress;
}

export function createNewSave(prefersReducedMotion = false): SaveGame {
  return {
    version: SAVE_VERSION,
    simulations: { moon: getInitialSimulationState('moon'), mars: getInitialSimulationState('mars') },
    journals: { moon: [], mars: [] },
    achievements: {},
    completedSites: [],
    viewedSites: [],
    progress: { moonTrainingComplete: false, introSeen: false },
    settings: defaultSettings(prefersReducedMotion),
    field: { moon: createFieldState(), mars: createFieldState() },
    game: createGameProgress(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Validate/repair an unknown value into a SaveGame. Never throws. */
export function migrateSave(raw: unknown, prefersReducedMotion = false): SaveGame {
  const base = createNewSave(prefersReducedMotion);
  if (!isObj(raw)) return base;
  const sims = isObj(raw.simulations) ? raw.simulations : {};
  for (const d of ['moon', 'mars'] as Destination[]) {
    const s = sims[d];
    if (isObj(s) && typeof s.currentSol === 'number' && isObj(s.powerAllocation) && isObj(s.currentEvent)) {
      base.simulations[d] = { ...base.simulations[d], ...(s as unknown as HabitatSimulationState) };
    }
    const j = isObj(raw.journals) ? raw.journals[d] : undefined;
    if (Array.isArray(j)) base.journals[d] = j.filter((e): e is JournalEntry => isObj(e) && typeof e.id === 'string');
  }
  if (isObj(raw.achievements)) {
    for (const [id, v] of Object.entries(raw.achievements)) {
      base.achievements[id] = isObj(v) && typeof v.unlockedAtSol === 'number' ? { unlockedAtSol: v.unlockedAtSol } : {};
    }
  }
  if (Array.isArray(raw.completedSites)) base.completedSites = raw.completedSites.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(raw.viewedSites)) base.viewedSites = raw.viewedSites.filter((x): x is string => typeof x === 'string');
  if (isObj(raw.progress)) {
    base.progress.moonTrainingComplete = raw.progress.moonTrainingComplete === true;
    base.progress.introSeen = raw.progress.introSeen === true;
  }
  base.settings = sanitizeSettings(isObj(raw) ? raw.settings : undefined, prefersReducedMotion);

  // Game-layer data is optional: saves from before it existed just get defaults.
  const fieldRaw = isObj(raw.field) ? raw.field : {};
  base.field = { moon: sanitizeField(fieldRaw.moon), mars: sanitizeField(fieldRaw.mars) };
  if (isObj(raw.game)) {
    const g = raw.game;
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    const mc = isObj(g.missionsCompleted) ? g.missionsCompleted : {};
    base.game = {
      xp: typeof g.xp === 'number' && Number.isFinite(g.xp) ? Math.max(0, Math.min(1e7, Math.floor(g.xp))) : 0,
      quizCorrect: list(g.quizCorrect),
      quizAnswered: list(g.quizAnswered),
      missionsCompleted: { moon: mc.moon === true, mars: mc.mars === true },
      artemisBriefingSeen: g.artemisBriefingSeen === true,
    };
  }
  return base;
}

/** Load current save; if none, import legacy v1 keys (achievements + explored sites). */
export function loadSave(storage: StorageLike, prefersReducedMotion = false): SaveGame {
  const current = safeParse(storage.getItem(SAVE_KEY));
  if (current) return migrateSave(current, prefersReducedMotion);

  const save = createNewSave(prefersReducedMotion);
  const legacyAch = safeParse(storage.getItem(LEGACY_ACHIEVEMENTS_KEY));
  if (Array.isArray(legacyAch)) {
    for (const a of legacyAch) {
      // Legacy 'first_touchdown' shipped pre-unlocked, so it is not proof of play: skip it.
      if (isObj(a) && a.unlocked === true && typeof a.id === 'string' && a.id !== 'first_touchdown') {
        save.achievements[a.id] = typeof a.unlockedAtSol === 'number' ? { unlockedAtSol: a.unlockedAtSol } : {};
      }
    }
  }
  const legacyViewed = safeParse(storage.getItem(LEGACY_EXPLORED_KEY));
  if (Array.isArray(legacyViewed)) save.viewedSites = legacyViewed.filter((x): x is string => typeof x === 'string');
  return save;
}

export function writeSave(storage: StorageLike, save: SaveGame): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
    return true;
  } catch {
    return false; // quota / private mode: game keeps running in memory
  }
}

/**
 * Resolve a usable storage. Accessing window.localStorage can THROW (blocked cookies, some
 * private modes) and writes can fail (quota). In those cases fall back to an in-memory store
 * so the game still runs, and report `persistent: false` so the UI can warn the player.
 */
export function resolveStorage(getter: () => StorageLike): { storage: StorageLike; persistent: boolean } {
  try {
    const s = getter();
    const probe = '__buildscapes_probe__';
    s.setItem(probe, '1');
    s.removeItem?.(probe);
    return { storage: s, persistent: true };
  } catch {
    const mem = new Map<string, string>();
    return {
      storage: {
        getItem: (k) => mem.get(k) ?? null,
        setItem: (k, v) => { mem.set(k, v); },
        removeItem: (k) => { mem.delete(k); },
      },
      persistent: false,
    };
  }
}
