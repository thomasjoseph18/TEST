import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;         // small pre-title badge text
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  accentClass?: string;   // e.g. 'text-cyan-400' or 'text-orange-400'
  className?: string;
}

export function SectionHeader({
  icon: Icon,
  label,
  title,
  subtitle,
  actionLabel,
  onAction,
  accentClass = 'text-cyan-400',
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${className}`}>
      <div className="space-y-1.5">
        {label && (
          <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${accentClass}`}>
            {label}
          </span>
        )}
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${accentClass}`} />}
          <h2 className="font-display font-black text-white uppercase tracking-wide text-base sm:text-lg">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 font-sans max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`flex items-center gap-1 text-xs font-mono font-semibold hover:text-slate-100 transition-colors cursor-pointer flex-shrink-0 ${accentClass}`}
        >
          <span>{actionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
