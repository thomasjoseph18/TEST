import React from 'react';
import {
  Moon,
  Flame,
  CheckCircle2,
  Scale,
  Clock,
  Thermometer,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Radio,
  Layers,
  Award,
  Zap,
} from 'lucide-react';
import { Destination } from '../../types';
import { MISSIONS } from '../../data/missions';

interface MissionSelectViewProps {
  selectedDestination: Destination;
  onSelectDestination: (dest: Destination) => void;
  onNavigateToHabitat?: () => void;
}

export const MissionSelectView: React.FC<MissionSelectViewProps> = ({
  selectedDestination,
  onSelectDestination,
  onNavigateToHabitat,
}) => {
  const moonMission = MISSIONS.moon;
  const marsMission = MISSIONS.mars;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
      
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>EXPEDITION COMMAND BRIEFING</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          Choose Your Planetary Destination
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Every planetary world presents unique physical laws, solar flux levels, and survival challenges. Select where you want to command your 30-Sol research habitat.
        </p>
      </div>

      {/* Grid of Moon and Mars Mission Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        
        {/* ================= MOON CARD ================= */}
        <div
          onClick={() => onSelectDestination('moon')}
          className={`cursor-pointer rounded-3xl border-2 p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between backdrop-blur-2xl relative overflow-hidden group ${
            selectedDestination === 'moon'
              ? 'border-cyan-400 bg-gradient-to-b from-[#09224A]/95 via-[#061530]/90 to-[#030b1b]/98 shadow-2xl shadow-cyan-950/70 scale-[1.01]'
              : 'border-slate-800 bg-[#070F2B]/75 hover:border-slate-700 hover:bg-[#09153a]/80'
          }`}
        >
          {/* Subtle Glow & Watermark */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          <div className="relative z-10 space-y-5">
            
            {/* Top Badge & Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-13 h-13 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-950/50 group-hover:scale-105 transition-transform">
                  <Moon className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                    DESTINATION ALPHA (1.3 LIGHT-SECONDS FROM EARTH)
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    The Moon (Artemis Base)
                  </h2>
                </div>
              </div>

              {selectedDestination === 'moon' && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold shadow-md shadow-cyan-950/50">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>SELECTED</span>
                </div>
              )}
            </div>

            {/* Outpost & Tagline */}
            <div>
              <div className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{moonMission.name} ({moonMission.location})</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {moonMission.tagline}
              </p>
            </div>

            {/* Scientific Telemetry Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Surface Gravity</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">{moonMission.gravity}</div>
                <span className="text-[10px] text-cyan-400">16.6% Earth Gravity</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Diurnal Cycle</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">{moonMission.dayLength}</div>
                <span className="text-[10px] text-cyan-400">Continuous Polar Sun</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Temperature</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">{moonMission.tempRange}</div>
                <span className="text-[10px] text-cyan-400">Extreme thermal swing</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Comms Latency</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">1.3 Seconds</div>
                <span className="text-[10px] text-emerald-400">Near Instant Telemetry</span>
              </div>
            </div>

            {/* Sol 1 Primary Mission Objective */}
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-xs text-slate-200 space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-300 font-bold flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Primary Expedition Objective:</span>
              </div>
              <p className="leading-relaxed text-slate-200">{moonMission.primaryObjective}</p>
            </div>

            {/* Historical Heritage Note */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-300 leading-relaxed flex items-start space-x-2">
              <Award className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span><strong>NASA Heritage:</strong> {moonMission.historyNote}</span>
            </div>

          </div>

          {/* Action Button */}
          <div className="pt-6 relative z-10 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectDestination('moon');
                if (onNavigateToHabitat) onNavigateToHabitat();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                selectedDestination === 'moon'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <span>{selectedDestination === 'moon' ? 'Enter Moon Habitat Deck' : 'Select Moon Expedition'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= MARS CARD ================= */}
        <div
          onClick={() => onSelectDestination('mars')}
          className={`cursor-pointer rounded-3xl border-2 p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between backdrop-blur-2xl relative overflow-hidden group ${
            selectedDestination === 'mars'
              ? 'border-amber-400 bg-gradient-to-b from-[#3a1a0c]/95 via-[#230f07]/90 to-[#120703]/98 shadow-2xl shadow-amber-950/70 scale-[1.01]'
              : 'border-slate-800 bg-[#070F2B]/75 hover:border-slate-700 hover:bg-[#09153a]/80'
          }`}
        >
          {/* Subtle Glow & Watermark */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          <div className="relative z-10 space-y-5">
            
            {/* Top Badge & Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-13 h-13 rounded-2xl bg-amber-950/90 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-950/50 group-hover:scale-105 transition-transform">
                  <Flame className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                    DESTINATION BETA (4 TO 24 LIGHT-MINUTES)
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Mars (Ares Jezero)
                  </h2>
                </div>
              </div>

              {selectedDestination === 'mars' && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-mono font-bold shadow-md shadow-amber-950/50">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>SELECTED</span>
                </div>
              )}
            </div>

            {/* Outpost & Tagline */}
            <div>
              <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>{marsMission.name} ({marsMission.location})</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {marsMission.tagline}
              </p>
            </div>

            {/* Scientific Telemetry Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Surface Gravity</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">{marsMission.gravity}</div>
                <span className="text-[10px] text-amber-400">38% Earth Gravity</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Martian Sol</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">{marsMission.dayLength}</div>
                <span className="text-[10px] text-amber-400">24h 39m Solar Day</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Atmosphere</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">95% CO₂</div>
                <span className="text-[10px] text-amber-400">Thin ~6 mbar surface</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Comms Latency</span>
                </div>
                <div className="text-slate-100 font-bold mt-1 text-sm">4 - 24 Minutes</div>
                <span className="text-[10px] text-amber-400">Requires Habitat Autonomy</span>
              </div>
            </div>

            {/* Sol 1 Primary Mission Objective */}
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-slate-200 space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-amber-300 font-bold flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Primary Expedition Objective:</span>
              </div>
              <p className="leading-relaxed text-slate-200">{marsMission.primaryObjective}</p>
            </div>

            {/* Historical Heritage Note */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-300 leading-relaxed flex items-start space-x-2">
              <Award className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span><strong>NASA Heritage:</strong> {marsMission.historyNote}</span>
            </div>

          </div>

          {/* Action Button */}
          <div className="pt-6 relative z-10 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectDestination('mars');
                if (onNavigateToHabitat) onNavigateToHabitat();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                selectedDestination === 'mars'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              <span>{selectedDestination === 'mars' ? 'Enter Mars Habitat Deck' : 'Select Mars Expedition'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
