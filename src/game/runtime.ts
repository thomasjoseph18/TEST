// Shared runtime plumbing for the first-person scenes: keyboard state, a tiny external store for
// HUD data (so the 3D loop never re-renders React every frame), and the Interactable contract.
import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------------------------
// Tiny store
// ---------------------------------------------------------------------------------------------
export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  replace(next: T): void;
  subscribe(fn: () => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  return {
    get: () => state,
    set(patch) {
      // Only notify when something actually changed, to keep React quiet.
      let changed = false;
      for (const k of Object.keys(patch) as (keyof T)[]) if (state[k] !== patch[k]) { changed = true; break; }
      if (!changed) return;
      state = { ...state, ...patch };
      emit();
    },
    replace(next) { state = next; emit(); },
    subscribe(fn) { subs.add(fn); return () => { subs.delete(fn); }; },
  };
}

export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ---------------------------------------------------------------------------------------------
// Interactables and markers
// ---------------------------------------------------------------------------------------------
export interface Interactable {
  id: string;
  x: number;
  z: number;
  /** Optional height of the thing above the ground, used to ignore interactions through floors. */
  y?: number;
  /** Reach, in metres, measured horizontally from the player. */
  radius: number;
  prompt: string | (() => string);
  /** Seconds the player must hold E. Omit for a simple press. */
  hold?: number;
  enabled?: () => boolean;
  onInteract: () => void;
  /** Hold progress callback (0..1), used to drive scan beams / sounds. */
  onHold?: (progress: number) => void;
  onHoldCancel?: () => void;
  /** Always-visible compass marker for this interactable. */
  marker?: { label: string; kind: 'site' | 'objective' | 'rover' | 'base' | 'door' };
}

export interface CompassMarker {
  id: string;
  label: string;
  kind: 'site' | 'objective' | 'rover' | 'base' | 'door';
  /** Bearing relative to where the player is looking, -180..180 degrees. */
  rel: number;
  distance: number;
  done?: boolean;
}

export interface HudSnapshot {
  prompt: string | null;
  /** Id of the interactable currently in focus (null when none). */
  focusId: string | null;
  holdProgress: number;
  /** 0..360, where 0 is the -z axis ("north" of the world). */
  heading: number;
  markers: CompassMarker[];
  speed: number;
  locked: boolean;
  driving: boolean;
  inColdShadow: boolean;
  sprinting: boolean;
}

export const hudStore = createStore<HudSnapshot>({
  prompt: null, focusId: null, holdProgress: 0, heading: 0, markers: [], speed: 0, locked: false, driving: false, inColdShadow: false, sprinting: false,
});

// ---------------------------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------------------------
class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private attached = false;
  /** When true, game keys are ignored (a panel or menu is open). */
  blocked = false;

  attach(): void {
    if (this.attached || typeof window === 'undefined') return;
    this.attached = true;
    window.addEventListener('keydown', (e) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (this.blocked) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
    window.addEventListener('blur', () => { this.down.clear(); this.pressed.clear(); });
  }

  isDown(...codes: string[]): boolean { return codes.some((c) => this.down.has(c)); }

  /** True once per key press. */
  wasPressed(...codes: string[]): boolean {
    let hit = false;
    for (const c of codes) if (this.pressed.delete(c)) hit = true;
    return hit;
  }

  clear(): void { this.down.clear(); this.pressed.clear(); }
}

export const input = new Input();

/** Seconds -> "m:ss". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}


// ---------------------------------------------------------------------------------------------
// Live stats (suit, rover, radiation) mirrored for the HUD at a few Hz
// ---------------------------------------------------------------------------------------------
export interface LiveStats {
  suitO2: number;
  suitPower: number;
  suitHealth: number;
  radiation: number;
  roverBattery: number;
  roverIntegrity: number;
  warning: 'ok' | 'low_o2' | 'low_power' | 'radiation' | 'critical';
  storm: boolean;
  evaRemaining: number;
  inRover: boolean;
  onSurface: boolean;
}

export const liveStore = createStore<LiveStats>({
  suitO2: 100, suitPower: 100, suitHealth: 100, radiation: 0, roverBattery: 100, roverIntegrity: 100,
  warning: 'ok', storm: false, evaRemaining: 600, inRover: false, onSurface: false,
});
