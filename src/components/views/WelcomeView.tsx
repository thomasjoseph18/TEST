import React from 'react';
import {
  Rocket,
  Compass,
  Sparkles,
  ChevronRight,
  Wind,
  Droplets,
  Zap,
  Thermometer,
  Moon,
  Flame,
  BookOpen,
  Activity,
  ArrowRight,
  Globe2,
} from 'lucide-react';
import { NavTab, Destination, HabitatSimulationState } from '../../types';
import { MISSIONS } from '../../data/missions';
import { CircularGauge } from '../common/CircularGauge';
import { StatusBadge, DestBadge } from '../common/StatusBadge';
import { SectionHeader } from '../common/SectionHeader';

interface WelcomeViewProps {
  onNavigate: (tab: NavTab) => void;
  destination: Destination;
  simulationState: HabitatSimulationState;
  onSelectDestination?: (dest: Destination) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onNavigate,
  destination,
  simulationState,
  onSelectDestination,
}) => {
  const isMars = destination === 'mars';
  const isCritical = simulationState.missionStatus === 'critical';
  const isVictory  = simulationState.missionStatus === 'victory';

  const sol = simulationState.currentSol;
  const totalSols = simulationState.totalSols;
  const progress = Math.round((sol / totalSols) * 100);
  const mission = MISSIONS[destination];

  // CTA label depends on state
  const ctaLabel = isVictory
    ? 'VIEW MISSION DEBRIEF'
    : isCritical
    ? 'REVIEW CRITICAL ALERTS'
    : sol === 1
    ? 'LAUNCH SOL 1 OPERATIONS'
    : `RESUME MISSION · SOL ${sol}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-20">

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 1 — MISSION HEADER
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <DestBadge destination={destination} />
            <StatusBadge status={simulationState.missionStatus} sol={sol} size="sm" />
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white uppercase tracking-tight leading-none drop-shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            BUILDSCAPES
          </h1>
          <div className={`font-tech font-bold text-base sm:text-lg tracking-widest uppercase ${
            isMars ? 'text-orange-400' : 'text-cyan-400'
          }`}>
            Apollo to Artemis Expedition
          </div>
        </div>

        {/* Sol timeline mini */}
        <div className="sm:text-right space-y-1 min-w-[180px]">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Mission Timeline
          </div>
          <div className="text-2xl font-display font-black text-white">
            Sol <span className={isMars ? 'text-orange-400' : 'text-cyan-400'}>{sol}</span>
            <span className="text-slate-600 text-lg"> / {totalSols}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isCritical
                  ? 'bg-red-500'
                  : isVictory
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                  : isMars
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-500">{progress}% complete</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 2 — DESTINATION HERO
      ════════════════════════════════════════════════════════════════════════ */}
      <div className={`rounded-3xl relative overflow-hidden p-6 sm:p-8 ${
        isMars ? 'dest-card-mars' : 'dest-card-moon'
      }`}>
        {/* Ambient glow blobs */}
        <div className={`absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 ${
          isMars ? 'bg-orange-500/10' : 'bg-cyan-500/10'
        }`} />
        <div className={`absolute bottom-0 left-0 w-56 h-56 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16 ${
          isMars ? 'bg-red-700/10' : 'bg-blue-600/10'
        }`} />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

          {/* Left: Mission brief */}
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
                isMars
                  ? 'bg-orange-950/80 border-orange-400/50 text-orange-300 shadow-orange-950/50'
                  : 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300 shadow-cyan-950/50'
              }`}>
                {isMars ? <Flame className="w-8 h-8" /> : <Moon className="w-8 h-8" />}
              </div>
              <div>
                <div className={`text-[11px] font-mono uppercase tracking-widest font-bold ${
                  isMars ? 'text-orange-400' : 'text-cyan-400'
                }`}>
                  {isMars ? 'DESTINATION BETA · JEZERO CRATER' : 'DESTINATION ALPHA · SHACKLETON BASIN'}
                </div>
                <h2 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight">
                  {mission.name}
                </h2>
              </div>
            </div>

            <p className="text-sm text-slate-300 font-sans leading-relaxed max-w-lg">
              {mission.tagline}
            </p>

            {/* Primary objective callout */}
            <div className={`rounded-xl border p-4 ${
              isMars
                ? 'bg-orange-950/30 border-orange-800/40'
                : 'bg-cyan-950/30 border-cyan-800/40'
            }`}>
              <div className={`text-[10px] font-mono uppercase tracking-wider font-bold mb-1 ${
                isMars ? 'text-orange-400' : 'text-cyan-400'
              }`}>
                Primary Objective
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                {mission.primaryObjective}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onNavigate('habitat')}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-display font-black text-sm shadow-xl transition-all cursor-pointer active:scale-95 ${
                  isVictory
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-amber-900/50 hover:from-amber-400'
                    : isCritical
                    ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-red-900/50 hover:from-red-500'
                    : isMars
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-orange-900/50 hover:from-orange-500'
                    : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 text-white shadow-cyan-900/50 hover:from-blue-500'
                } ${isCritical || isVictory ? '' : isMars ? 'glow-orange' : 'glow-cyan'}`}
              >
                <Rocket className="w-4 h-4" />
                <span>{ctaLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('exploration')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 text-slate-200 font-tech font-bold text-sm tracking-wider transition-all cursor-pointer"
              >
                <Globe2 className="w-4 h-4 text-cyan-400" />
                <span>SURFACE EVA</span>
              </button>

              <button
                onClick={() => onNavigate('journal')}
                className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>MISSION LOGS</span>
              </button>
            </div>
          </div>

          {/* Right: Quick stats + destination switcher */}
          <div className="space-y-4">
            {/* Destination switcher pill */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              {(['moon', 'mars'] as Destination[]).map((dest) => (
                <button
                  key={dest}
                  onClick={() => onSelectDestination && onSelectDestination(dest)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-tech font-black tracking-wider transition-all cursor-pointer ${
                    destination === dest
                      ? dest === 'mars'
                        ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/40'
                        : 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {dest === 'moon' ? <Moon className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
                  <span className="uppercase">{dest === 'moon' ? 'Moon (Artemis)' : 'Mars (Jezero)'}</span>
                </button>
              ))}
            </div>

            {/* Mission facts grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              {[
                { label: 'Gravity',     value: mission.gravity },
                { label: 'Sol Length',  value: mission.dayLength },
                { label: 'Temperature', value: mission.tempRange },
                { label: 'Atmosphere',  value: isMars ? '95% CO₂, 6 mbar' : 'Hard vacuum' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className={`text-[9px] uppercase tracking-wider mb-1 ${
                    isMars ? 'text-orange-400' : 'text-cyan-400'
                  }`}>{label}</div>
                  <div className="text-slate-100 font-bold text-sm leading-tight">{value}</div>
                </div>
              ))}
            </div>

            {/* Explore CTA */}
            <button
              onClick={() => onNavigate('missions')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900/70 text-slate-300 hover:text-white text-xs font-tech font-bold tracking-wider transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Compare Planetary Environments</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 3 — LIFE SUPPORT QUICK STATS
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <SectionHeader
          icon={Activity}
          label="Sol Status"
          title={`Life-Support Subsystems · Sol ${sol}`}
          actionLabel="Open Engineering Deck"
          onAction={() => onNavigate('habitat')}
          accentClass={isMars ? 'text-orange-400' : 'text-cyan-400'}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CircularGauge
            value={simulationState.oxygenLevel}
            label="Oxygen Atmosphere"
            subLabel={`Mode: ${simulationState.o2Mode}`}
            color={simulationState.oxygenLevel > 50 ? 'cyan' : 'red'}
            icon={Wind}
            statusText={simulationState.oxygenLevel > 70 ? 'NOMINAL' : simulationState.oxygenLevel > 30 ? 'CAUTION' : 'CRITICAL'}
            deltaText={simulationState.netO2Delta >= 0 ? `+${simulationState.netO2Delta}%/Sol` : `${simulationState.netO2Delta}%/Sol`}
            onClick={() => onNavigate('habitat')}
          />
          <CircularGauge
            value={simulationState.waterLevel}
            label="Water Recycling"
            subLabel={`Loop: ${simulationState.waterRecyclerMode}`}
            color={simulationState.waterLevel > 50 ? 'blue' : 'red'}
            icon={Droplets}
            statusText={simulationState.waterLevel > 70 ? 'NOMINAL' : simulationState.waterLevel > 30 ? 'CAUTION' : 'CRITICAL'}
            deltaText={simulationState.netWaterDelta >= 0 ? `+${simulationState.netWaterDelta}%/Sol` : `${simulationState.netWaterDelta}%/Sol`}
            onClick={() => onNavigate('habitat')}
          />
          <CircularGauge
            value={simulationState.batteryCharge}
            label="Power Storage"
            subLabel={`${simulationState.batteryDeltaKw >= 0 ? `+${simulationState.batteryDeltaKw}` : simulationState.batteryDeltaKw} kW Net`}
            color={simulationState.batteryCharge > 30 ? 'amber' : 'red'}
            icon={Zap}
            statusText={simulationState.batteryCharge > 60 ? 'NOMINAL' : simulationState.batteryCharge > 25 ? 'WARNING' : 'LOW POWER'}
            deltaText={`${simulationState.batteryDeltaKw >= 0 ? `+${simulationState.batteryDeltaKw}` : simulationState.batteryDeltaKw} kW`}
            onClick={() => onNavigate('habitat')}
          />
          <CircularGauge
            value={simulationState.habitatIntegrity}
            label="Structural Hull"
            subLabel={`Internal: ${simulationState.habitatTempC}°C`}
            color={simulationState.habitatIntegrity > 50 ? 'emerald' : 'red'}
            icon={Thermometer}
            statusText={simulationState.habitatIntegrity > 75 ? 'SEALED' : simulationState.habitatIntegrity > 40 ? 'STRESSED' : 'BREACH'}
            deltaText={`Temp: ${simulationState.habitatTempC}°C`}
            onClick={() => onNavigate('habitat')}
          />
        </div>

        {/* Sol event teaser */}
        {simulationState.currentEvent && (
          <div className={`flex items-start gap-4 p-4 rounded-2xl border ${
            isMars ? 'border-orange-800/40 bg-orange-950/15' : 'border-cyan-800/40 bg-cyan-950/15'
          }`}>
            <Sparkles className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isMars ? 'text-orange-400' : 'text-amber-400'}`} />
            <div className="space-y-0.5 min-w-0">
              <div className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                isMars ? 'text-orange-400' : 'text-cyan-400'
              }`}>
                Sol {sol} Mission Event
              </div>
              <div className="text-sm font-display font-bold text-white truncate">
                {simulationState.currentEvent.title}
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-2">
                {simulationState.currentEvent.description}
              </p>
            </div>
            <button
              onClick={() => onNavigate('habitat')}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <span>Respond</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
