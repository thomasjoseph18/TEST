import React from 'react';

interface CircularGaugeProps {
  value: number;
  label: string;
  subLabel?: string;
  color?: 'cyan' | 'blue' | 'amber' | 'emerald' | 'red';
  icon: React.ComponentType<{ className?: string }>;
  statusText?: string;
  unit?: string;
  deltaText?: string;
  onClick?: () => void;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  label,
  subLabel,
  color = 'cyan',
  icon: Icon,
  statusText,
  unit = '%',
  deltaText,
  onClick,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  const colorConfig = {
    cyan: {
      stroke: '#06b6d4',
      glow: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]',
      bg: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300',
      badge: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
      iconColor: 'text-cyan-400',
    },
    blue: {
      stroke: '#3b82f6',
      glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]',
      bg: 'bg-blue-950/40 border-blue-500/30 text-blue-300',
      badge: 'bg-blue-950 text-blue-300 border-blue-500/40',
      iconColor: 'text-blue-400',
    },
    amber: {
      stroke: '#f59e0b',
      glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
      badge: 'bg-amber-950 text-amber-300 border-amber-500/40',
      iconColor: 'text-amber-400',
    },
    emerald: {
      stroke: '#10b981',
      glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
      iconColor: 'text-emerald-400',
    },
    red: {
      stroke: '#ef4444',
      glow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]',
      bg: 'bg-red-950/40 border-red-500/40 text-red-300',
      badge: 'bg-red-950 text-red-300 border-red-500/50',
      iconColor: 'text-red-400',
    },
  };

  const activeColor = colorConfig[color];

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-2xl aerospace-hud transition-all duration-300 flex flex-col items-center justify-between group ${
        onClick ? 'cursor-pointer hover:border-cyan-400/60 hover:scale-[1.02]' : ''
      }`}
    >
      {/* Technical HUD Corner Reticles */}
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Top Header Label */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Icon className={`w-4 h-4 ${activeColor.iconColor}`} />
          <span className="text-xs font-tech font-bold tracking-wider text-slate-200 uppercase">
            {label}
          </span>
        </div>
        {statusText && (
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${activeColor.badge}`}
          >
            {statusText}
          </span>
        )}
      </div>

      {/* Circular Instrument Dial */}
      <div className="relative my-3 flex items-center justify-center">
        <svg className="w-28 h-28 transform -rotate-90">
          {/* Background Outer Ring */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke="currentColor"
            strokeWidth="7"
            className="text-slate-800/80"
            fill="transparent"
          />
          {/* Background Tick Marks */}
          <circle
            cx="56"
            cy="56"
            r={radius + 6}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 6"
            className="text-slate-700/60"
            fill="transparent"
          />
          {/* Active Radial Progress Arc */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke={activeColor.stroke}
            strokeWidth="7"
            className={`transition-all duration-700 ${activeColor.glow}`}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Digital Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display font-black text-2xl text-white tracking-tight drop-shadow-md">
            {value}
            <span className="text-xs font-mono font-normal text-slate-400 ml-0.5">{unit}</span>
          </span>
          {subLabel && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              {subLabel}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Telemetry Footer */}
      {deltaText && (
        <div className="w-full pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>RATE DELTA:</span>
          <span className={`font-bold ${deltaText.startsWith('+') ? 'text-emerald-400' : 'text-slate-200'}`}>
            {deltaText}
          </span>
        </div>
      )}
    </div>
  );
};
