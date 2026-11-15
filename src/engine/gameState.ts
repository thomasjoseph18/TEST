// Game state machine for the first-person experience. Pure reducer, no React.
// Invalid transitions are ignored (state returned unchanged), never thrown, so a stray
// event from a UI can never crash or desync the game.
import type { Destination } from '../types.ts';

export type Screen =
  | 'boot'        // loading / save restore
  | 'intro'       // Apollo 13 cinematic (Phase 1)
  | 'command'     // Mission Command Centre (Phase 2)
  | 'navigation'  // star-map console (Phase 2)
  | 'habitat'     // walkable habitat interior (Phase 4)
  | 'surface'     // Moon / Mars first-person surface (Phases 3, 5)
  | 'debrief'     // mission debrief room (Phase 6)
  | 'classic';    // temporary original dashboard app

export type DestinationId = Destination | 'artemis';

export interface Unlocks {
  moonTrainingComplete: boolean;
}

export interface GameState {
  screen: Screen;
  destination: Destination;
  /** Where "Exit classic mode" returns to. Never 'classic' or 'boot'. */
  resumeScreen: Exclude<Screen, 'classic' | 'boot'>;
  /** Set when a destination was refused, so the UI can explain why (educational, non-punitive). */
  notice: 'mars_locked' | 'artemis_locked' | null;
}

export type GameAction =
  | { type: 'BOOT_DONE'; introSeen: boolean; uiMode: 'game' | 'classic' }
  | { type: 'INTRO_FINISHED' }          // finished OR skipped
  | { type: 'REPLAY_INTRO' }
  | { type: 'GO_COMMAND' }
  | { type: 'OPEN_NAVIGATION' }
  | { type: 'SELECT_DESTINATION'; destination: DestinationId; unlocks: Unlocks }
  | { type: 'ENTER_HABITAT' }
  | { type: 'ENTER_SURFACE' }
  | { type: 'MISSION_ENDED' }
  | { type: 'DEBRIEF_DONE' }
  | { type: 'ENTER_CLASSIC' }
  | { type: 'EXIT_CLASSIC' };

export function initialGameState(): GameState {
  return { screen: 'boot', destination: 'moon', resumeScreen: 'command', notice: null };
}

export function isDestinationUnlocked(id: DestinationId, unlocks: Unlocks): boolean {
  if (id === 'moon') return true;
  if (id === 'mars') return unlocks.moonTrainingComplete;
  return false; // Artemis stays a locked future destination
}

/** Screens that count as "in the game" (valid resume targets). */
const RESUMABLE: Screen[] = ['intro', 'command', 'navigation', 'habitat', 'surface', 'debrief'];

export function gameReducer(state: GameState, action: GameAction): GameState {
  const go = (screen: Exclude<Screen, 'classic' | 'boot'>, patch: Partial<GameState> = {}): GameState => ({
    ...state, ...patch, screen, resumeScreen: screen, notice: patch.notice ?? null,
  });
  const s = state.screen;

  switch (action.type) {
    case 'BOOT_DONE':
      if (s !== 'boot') return state;
      if (action.uiMode === 'classic') return { ...state, screen: 'classic', resumeScreen: action.introSeen ? 'command' : 'intro' };
      return action.introSeen ? go('command') : go('intro');
    case 'INTRO_FINISHED':
      return s === 'intro' ? go('command') : state;
    case 'REPLAY_INTRO':
      return s === 'command' || s === 'navigation' ? go('intro') : state;
    case 'GO_COMMAND':
      return s === 'navigation' || s === 'habitat' || s === 'surface' || s === 'debrief' ? go('command') : state;
    case 'OPEN_NAVIGATION':
      return s === 'command' ? go('navigation') : state;
    case 'SELECT_DESTINATION': {
      if (s !== 'navigation') return state;
      if (!isDestinationUnlocked(action.destination, action.unlocks)) {
        return { ...state, notice: action.destination === 'artemis' ? 'artemis_locked' : 'mars_locked' };
      }
      return go('navigation', { destination: action.destination as Destination });
    }
    case 'ENTER_HABITAT':
      return s === 'navigation' || s === 'command' || s === 'surface' ? go('habitat') : state;
    case 'ENTER_SURFACE':
      return s === 'navigation' || s === 'habitat' ? go('surface') : state;
    case 'MISSION_ENDED':
      return s === 'habitat' || s === 'surface' || s === 'command' ? go('debrief') : state;
    case 'DEBRIEF_DONE':
      return s === 'debrief' ? go('command') : state;
    case 'ENTER_CLASSIC':
      if (s === 'classic' || s === 'boot') return state;
      return { ...state, screen: 'classic', resumeScreen: RESUMABLE.includes(s) ? (s as GameState['resumeScreen']) : 'command', notice: null };
    case 'EXIT_CLASSIC':
      return s === 'classic' ? { ...state, screen: state.resumeScreen, notice: null } : state;
  }
}
