import React from 'react';
import {
  Trophy,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Rocket,
  Wind,
  Droplets,
  Zap,
  ShieldCheck,
  Sparkles,
  Home,
} from 'lucide-react';
import { MissionStatus, Destination, HabitatSimulationState } from '../types';
import { NavTab } from '../types';

interface MissionDebriefScreenProps {
  status: MissionStatus;
  destination: Destination;
  simulationState: HabitatSimulationState;
  onReset: () => void;
  onNavigate: (tab: NavTab) => void;
}

const VICTORY_FACTS: Record<Destination, string[]> = {
  moon: [
    'You kept oxygen above safe levels for 30 Sols — just like the real Artemis Base Camp life support engineers!',
    'Solar panel maintenance matters: lunar regolith dust can cut power by 40% if panels are not cleaned.',
    'Water recycling at 95%+ efficiency is the key to long-duration lunar stays. NASA\'s ECLSS achieves 93% today!',
  ],
  mars: [
    'You survived the communications blackout — Mars is 4–24 light-minutes from Earth, so your habitat must be fully autonomous!',
    'Managing CO₂ scrubbers on Mars is critical: the atmosphere is 95% carbon dioxide and will kill in minutes if the habitat seal fails.',
    'MOXIE demonstrated on Perseverance that oxygen CAN be made from Martian air — your ISRU system did the same!',
  ],
};

const FAILURE_FACTS: Record<Destination, string[]> = {
  moon: [
    'Power management is critical at the lunar poles — even one Sol with dead batteries can freeze life support systems.',
    'Oxygen scrubbers need power. When power drops, O₂ levels drop within hours.',
    'Water recycling saves lives. Without it, a crew of 4 needs 4 litres per person per day shipped from Earth!',
  ],
  mars: [
    'Martian dust storms can last months and reduce solar power to near zero — always maintain battery reserves!',
    'Thermal regulation on Mars requires constant power. Temperatures drop to -80°C at night without heating.',
    'ISRU failures mean no backup oxygen. The MOXIE system must run continuously to maintain habitat reserves.',
  ],
};

export const MissionDebriefScreen: React.FC<MissionDebriefScreenProps> = ({
  status,
  destination,
  simulationState,
  onReset,
  onNavigate,
}) => {
  const isVictory = status === 'victory';
  const isMars = destination === 'mars';
  const facts = isVictory ? VICTORY_FACTS[destination] : FAILURE_FACTS[destination];

  const resources = [
    { label: 'Oxygen',    value: simulationState.oxygenLevel,     icon: Wind,       color: 'text-cyan-400' },
    { label: 'Water',     value: simulationState.waterLevel,       icon: Droplets,   color: 'text-blue-400' },
    { label: 'Power',     value: simulationState.batteryCharge,    icon: Zap,        color: 'text-amber-400' },
    { label: 'Hull',      value: simulationState.habitatIntegrity, icon: ShieldCheck,color: 'text-emerald-400' },
  ];

  return (
    <div
      className={`debrief-overlay flex items-center justify-center p-4 ${
        isVictory ? 'debrief-victory' : 'debrief-critical'
      }`}
    >
      <div className="animate-slideUp max-w-2xl w-full space-y-6">

        {/* ── Header ── */}
        <div className="text-center space-y-4">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 shadow-2xl ${
              isVictory
                ? 'border-amber-400/60 bg-amber-950/50 shadow-amber-900/60'
                : 'border-red-500/60 bg-red-950/50 shadow-red-900/60'
            }`}
          >
            {isVictory
              ? <Trophy className="w-10 h-10 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              : <AlertTriangle className="w-10 h-10 text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
            }
          </div>

          <div>
            <div className={`text-[11px] font-mono uppercase tracking-widest mb-1 ${
              isVictory ? 'text-amber-400' : 'text-red-400'
            }`}>
              {isMars ? 'ARES JEZERO OUTPOST' : 'SHACKLETON BASE CAMP'} · SOL {simulationState.currentSol}
            </div>
            <h1 className={`font-display font-black text-3xl sm:text-4xl uppercase tracking-tight ${
              isVictory ? 'text-amber-200' : 'text-red-200'
            }`}>
              {isVictory ? '30-SOL MISSION COMPLETE' : 'MISSION TERMINATED'}
            </h1>
            <p className="text-slate-300 text-sm font-sans mt-2 leading-relaxed">
              {isVictory
                ? `Outstanding work, Commander! You maintained a survivable habitat on ${isMars ? 'Mars' : 'the Moon'} for the full 30-Sol mission window.`
                : `Life support systems fell below survivable thresholds on Sol ${simulationState.currentSol}. Review the debrief below and try again.`
              }
            </p>
          </div>
        </div>

        {/* ── Final Resource Snapshot ── */}
        <div className={`rounded-2xl border p-5 ${
          isVictory
            ? 'border-amber-500/30 bg-amber-950/20'
            : 'border-red-500/30 bg-red-950/20'
        }`}>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-3">
            Final Life-Support Readings
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {resources.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className={`font-mono font-black text-lg ${
                  value > 50 ? 'text-slate-100' : value > 25 ? 'text-amber-300' : 'text-red-400'
                }`}>{Math.round(value)}%</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Educational Debrief ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-tech font-bold uppercase tracking-wider">
              {isVictory ? 'What You Mastered' : 'What to Improve Next Time'}
            </span>
          </div>
          <div className="space-y-2">
            {facts.map((fact, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 font-sans leading-relaxed">
                <span className={`font-mono font-bold flex-shrink-0 ${
                  isVictory ? 'text-amber-400' : 'text-cyan-400'
                }`}>{i + 1}.</span>
                <span>{fact}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-display font-black text-sm transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>RESTART MISSION</span>
          </button>

          <button
            onClick={() => onNavigate('journal')}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-tech font-bold text-sm transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>VIEW MISSION JOURNAL</span>
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-tech font-bold text-sm transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span className="sm:hidden">HOME</span>
          </button>
        </div>

        {isVictory && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-200 text-xs font-mono">
              <Rocket className="w-4 h-4 text-amber-300" />
              <span>JUNIOR ASTRONAUT EXPEDITION WINGS — 30-SOL CLASS — EARNED</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
