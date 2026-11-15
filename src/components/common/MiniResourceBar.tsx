interface MiniResourceBarProps {
  label: string;
  value: number;          // 0–100
  warnAt?: number;
  critAt?: number;
  unit?: string;
  deltaText?: string;
  size?: 'sm' | 'md';
  showValue?: boolean;
}

function barColor(value: number, warnAt: number, critAt: number): string {
  if (value <= critAt)  return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]';
  if (value <= warnAt)  return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]';
  return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]';
}

function textColor(value: number, warnAt: number, critAt: number): string {
  if (value <= critAt)  return 'text-red-400';
  if (value <= warnAt)  return 'text-amber-400';
  return 'text-emerald-400';
}

export function MiniResourceBar({
  label,
  value,
  warnAt = 50,
  critAt = 25,
  unit = '%',
  deltaText,
  size = 'md',
  showValue = true,
}: MiniResourceBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const barH = size === 'sm' ? 'h-1.5' : 'h-2';
  const textSz = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`font-mono font-semibold text-slate-300 uppercase tracking-wider ${textSz}`}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {deltaText && (
            <span className="text-[10px] font-mono text-slate-500">{deltaText}</span>
          )}
          {showValue && (
            <span className={`font-mono font-bold ${textSz} ${textColor(pct, warnAt, critAt)}`}>
              {pct}{unit}
            </span>
          )}
        </div>
      </div>

      <div className={`w-full ${barH} rounded-full bg-slate-900 border border-slate-800/80 overflow-hidden`}>
        <div
          className={`${barH} rounded-full transition-all duration-500 ${barColor(pct, warnAt, critAt)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Compact inline bar (for HUD overlays / ribbon) ──────────────────────────

interface InlineBarProps {
  value: number;
  color: string;   // tailwind bg-* class
  className?: string;
}

export function InlineBar({ value, color, className = '' }: InlineBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`h-1 rounded-full bg-slate-800 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
