// Settings defaults + sanitiser. Pure; safe to run on untrusted/corrupt saved data.
import type { SettingsConfig, UiMode } from '../types.ts';

/** The first-person game is the main experience. Classic mode stays available in Settings and as a fallback. */
export const DEFAULT_UI_MODE: UiMode = 'game';

export function defaultSettings(prefersReducedMotion = false): SettingsConfig {
  return {
    callSign: 'Cadet Commander',
    audioEnabled: true,
    novaVoiceEnabled: true,
    textSize: 'normal',
    lowPerformanceMode: false,
    reducedMotion: prefersReducedMotion,
    captionsEnabled: true,
    masterVolume: 0.7,
    uiMode: DEFAULT_UI_MODE,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Keep valid fields, fall back to defaults for anything missing or malformed. */
export function sanitizeSettings(raw: unknown, prefersReducedMotion = false): SettingsConfig {
  const d = defaultSettings(prefersReducedMotion);
  if (!isObj(raw)) return d;
  const bool = (k: keyof SettingsConfig, fallback: boolean) => (typeof raw[k] === 'boolean' ? (raw[k] as boolean) : fallback);
  const callSign =
    typeof raw.callSign === 'string' ? raw.callSign.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) : '';
  const vol = typeof raw.masterVolume === 'number' && Number.isFinite(raw.masterVolume) ? raw.masterVolume : d.masterVolume;
  return {
    callSign: callSign || d.callSign,
    audioEnabled: bool('audioEnabled', d.audioEnabled),
    novaVoiceEnabled: bool('novaVoiceEnabled', d.novaVoiceEnabled),
    textSize: raw.textSize === 'large' ? 'large' : 'normal',
    lowPerformanceMode: bool('lowPerformanceMode', d.lowPerformanceMode),
    reducedMotion: bool('reducedMotion', d.reducedMotion),
    captionsEnabled: bool('captionsEnabled', d.captionsEnabled),
    masterVolume: Math.min(1, Math.max(0, vol)),
    uiMode: raw.uiMode === 'game' || raw.uiMode === 'classic' ? raw.uiMode : d.uiMode,
  };
}
