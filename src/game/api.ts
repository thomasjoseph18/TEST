// The contract between the 3D scenes (inside the R3F canvas) and the game app (React DOM).
// It is passed down as a plain prop because React context does not cross the canvas boundary.
import type { Destination, HabitatSimulationState } from '../types';
import type { FieldState, HabitatSystemId, SuitTickContext } from '../engine/field';

export interface TickInfo extends Omit<SuitTickContext, 'storm' | 'sheltered'> {
  /** Rover speed in m/s (0 when walking). */
  roverSpeed: number;
  x: number;
  z: number;
}

export type PanelKind =
  | 'oxygen' | 'water' | 'power' | 'food' | 'radiation' | 'console'
  | 'navigation' | 'objectives' | 'status' | 'journal' | 'achievements' | 'replay' | 'nova';

export type ToastTone = 'info' | 'good' | 'warn' | 'bad';

export interface SceneApi {
  destination: Destination;
  lowPerf: boolean;
  reducedMotion: boolean;
  /** Latest values, read inside the frame loop. */
  getSim(): HabitatSimulationState;
  getField(): FieldState;
  getCompletedSites(): string[];
  /** Per-frame-ish systems tick (suit, radiation, rover). Called ~10x per second from surface scenes. */
  tick(info: TickInfo): void;
  patchField(fn: (f: FieldState) => FieldState): void;
  setFlag(flag: string): void;
  roverImpact(speed: number): void;
  // surface actions
  startTask(siteId: string): void;
  openSite(siteId: string): void;
  collectSample(): void;
  cleanSolar(): void;
  chargeRover(): void;
  // habitat actions
  inspectSystem(id: HabitatSystemId): void;
  openPanel(panel: PanelKind): void;
  refillSuit(): void;
  harvest(): void;
  sleep(): void;
  // navigation
  enterHabitat(): void;
  enterSurface(): void;
  goCommand(): void;
  endMission(): void;
  // feedback
  say(text: string): void;
  toast(text: string, tone?: ToastTone): void;
  /** Scenes call this once their first frames are on screen so the loading cover can lift. */
  sceneReady(): void;
  /** Incremented when the player was recovered after a suit emergency: scenes should respawn. */
  recoveryNonce: number;
}
