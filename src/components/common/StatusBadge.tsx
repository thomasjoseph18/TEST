import { MissionStatus, Destination } from '../../types';

interface StatusBadgeProps {
  status: MissionStatus;
  sol?: number;
  size?: 'sm' | 'md';
}

const CONFIG = {
  critical: {
    label: 'MISSION CRITICAL',
    dot:  'bg-red-500 animate-ping',
    dot2: 'bg-red-600',
    text: 'text-red-300',
    ring: 'border-red-500/60 bg-red-950/60',
  },
  victory: {
    label: 'MISSION COMPLETE',
    dot:  'bg-amber-400 animate-ping',
    dot2: 'bg-amber-500',
    text: 'text-amber-200',
    ring: 'border-amber-400/60 bg-amber-950/60',
  },
  active: {
    label: 'NOMINAL',
    dot:  'bg-emerald-400 animate-ping',
    dot2: 'bg-emerald-500',
    text: 'text-emerald-300',
    ring: 'border-emerald-500/40 bg-emerald-950/40',
  },
};

export function StatusBadge({ status, sol, size = 'md' }: StatusBadgeProps) {
  const cfg = CONFIG[status];
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1.5';
  const txt = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border font-mono font-bold ${px} ${txt} ${cfg.ring} ${cfg.text}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot2}`} />
      </span>
      <span>{cfg.label}{sol !== undefined ? ` · SOL ${sol}` : ''}</span>
    </div>
  );
}

// ─── Destination Badge ────────────────────────────────────────────────────────

interface DestBadgeProps {
  destination: Destination;
  size?: 'sm' | 'md';
}

export function DestBadge({ destination, size = 'md' }: DestBadgeProps) {
  const isMars = destination === 'mars';
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const txt = size === 'sm' ? 'text-[9px]' : 'text-[10px]';
  const cls = isMars
    ? 'border-orange-500/40 bg-orange-950/50 text-orange-300'
    : 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-bold uppercase tracking-wider ${px} ${txt} ${cls}`}
    >
      <span>{isMars ? '🔴' : '🌕'}</span>
      <span>{isMars ? 'MARS · JEZERO' : 'MOON · ARTEMIS'}</span>
    </span>
  );
}
