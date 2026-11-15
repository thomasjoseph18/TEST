/**
 * BUILDSCAPES: Apollo to Artemis — Design System
 * Single source of truth for colours, class builders, and shared UI patterns.
 * Import from this file instead of hard-coding Tailwind strings throughout the app.
 */

import type { Destination, MissionStatus } from './types';

// ─── Raw Colour Values ───────────────────────────────────────────────────────
// Use these for Three.js materials, inline styles, and canvas operations.
export const COLORS = {
  // Space backgrounds
  void:        '#000005',
  spaceBg:     '#020617',
  surface1:    '#080f1e',
  surface2:    '#0a1428',
  surface3:    '#0e1c38',

  // Moon palette
  moonPrimary: '#22d3ee',   // cyan-400
  moonGlow:    'rgba(34,211,238,0.30)',
  moonSurface: '#080f1e',
  moonTerrain: '#7a7a78',
  moonLight:   '#fffff8',

  // Mars palette
  marsPrimary: '#fb923c',   // orange-400
  marsGlow:    'rgba(251,146,60,0.30)',
  marsSurface: '#1c0d05',
  marsTerrain: '#8b4513',
  marsLight:   '#ffe8c0',

  // Status
  success:     '#34d399',   // emerald-400
  warning:     '#fbbf24',   // amber-400
  danger:      '#f87171',   // red-400
  gold:        '#fde68a',   // amber-200
} as const;

// ─── Destination-Aware Helpers ────────────────────────────────────────────────

export function accentColor(destination: Destination): string {
  return destination === 'mars' ? COLORS.marsPrimary : COLORS.moonPrimary;
}

export function destText(destination: Destination): string {
  return destination === 'mars' ? 'text-orange-400' : 'text-cyan-400';
}

export function destBorder(destination: Destination): string {
  return destination === 'mars' ? 'border-orange-500/40' : 'border-cyan-500/40';
}

export function destBg(destination: Destination): string {
  return destination === 'mars'
    ? 'bg-orange-950/30'
    : 'bg-cyan-950/30';
}

export function destGlow(destination: Destination): string {
  return destination === 'mars' ? 'glow-orange' : 'glow-cyan';
}

export function destHud(destination: Destination): string {
  return destination === 'mars' ? 'aerospace-hud-mars' : 'aerospace-hud';
}

// ─── Mission Status Helpers ───────────────────────────────────────────────────

export function statusColor(status: MissionStatus): string {
  if (status === 'critical') return 'text-red-400';
  if (status === 'victory')  return 'text-amber-300';
  return 'text-emerald-400';
}

export function statusBorderColor(status: MissionStatus): string {
  if (status === 'critical') return 'border-red-500/60';
  if (status === 'victory')  return 'border-amber-400/60';
  return 'border-cyan-500/40';
}

export function statusLabel(status: MissionStatus): string {
  if (status === 'critical') return 'MISSION CRITICAL';
  if (status === 'victory')  return 'MISSION COMPLETE';
  return 'NOMINAL';
}

// ─── Resource Status ──────────────────────────────────────────────────────────

export function resourceStatus(value: number, warnAt = 50, critAt = 25): 'nominal' | 'warning' | 'critical' {
  if (value <= critAt)  return 'critical';
  if (value <= warnAt)  return 'warning';
  return 'nominal';
}

export function resourceColor(value: number, warnAt = 50, critAt = 25): string {
  const status = resourceStatus(value, warnAt, critAt);
  if (status === 'critical') return 'text-red-400';
  if (status === 'warning')  return 'text-amber-400';
  return 'text-emerald-400';
}

export function resourceBarColor(value: number, warnAt = 50, critAt = 25): string {
  const status = resourceStatus(value, warnAt, critAt);
  if (status === 'critical') return 'bg-red-500';
  if (status === 'warning')  return 'bg-amber-400';
  return 'bg-emerald-400';
}

// ─── Shared Class Strings ─────────────────────────────────────────────────────

export const CLS = {
  // Cards
  card: 'rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-sm',
  cardElevated: 'rounded-2xl border border-slate-700/60 bg-[#0a1428]/80 backdrop-blur-md shadow-xl',

  // Buttons
  btnPrimary: (dest: Destination) =>
    dest === 'mars'
      ? 'flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-display font-black text-sm shadow-lg shadow-orange-900/40 transition-all cursor-pointer active:scale-95'
      : 'flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-black text-sm shadow-lg shadow-cyan-900/40 transition-all cursor-pointer active:scale-95',

  btnSecondary: 'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-tech font-bold text-xs tracking-wider transition-all cursor-pointer',

  btnGhost: 'flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer',

  // Section headers
  sectionLabel: 'text-[10px] font-mono uppercase tracking-widest font-bold',
  sectionTitle: 'font-display font-black text-white uppercase tracking-wide',

  // Telemetry chips
  telemetryChip: 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono',
} as const;
