import React, { useState } from 'react';
import {
  Wind,
  Droplets,
  Zap,
  Sparkles,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Brush,
  Flame,
  ShieldCheck,
  Radio,
  FlaskConical,
  Award,
  Thermometer,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  Destination,
  HabitatSimulationState,
  O2Mode,
  WaterRecyclerMode,
  WaterRation,
  PowerAllocation,
} from '../../types';
import { CircularGauge } from '../common/CircularGauge';

interface HabitatControlDeckProps {
  state: HabitatSimulationState;
  calculations: {
    powerGenerated: number;
    totalDemand: number;
    netPowerKw: number;
    o2Delta: number;
    waterDelta: number;
  };
  destination: Destination;
  onSetO2Mode: (mode: O2Mode) => void;
  onSetWaterRecyclerMode: (mode: WaterRecyclerMode) => void;
  onSetWaterRation: (ration: WaterRation) => void;
  onToggleIceSmelting: () => void;
  onTogglePowerAllocation: (key: keyof PowerAllocation) => void;
  onCleanSolarPanels: () => void;
  onUseEmergencyO2: () => void;
  onAdvanceSol: () => void;
  onResetSimulation: () => void;
}

export const HabitatControlDeck: React.FC<HabitatControlDeckProps> = ({
  state,
  calculations,
  destination,
  onSetO2Mode,
  onSetWaterRecyclerMode,
  onSetWaterRation,
  onToggleIceSmelting,
  onTogglePowerAllocation,
  onCleanSolarPanels,
  onUseEmergencyO2,
  onAdvanceSol,
  onResetSimulation,
}) => {
  const [activeSubsystem, setActiveSubsystem] = useState<'o2' | 'water' | 'power' | null>('o2');
  const isMars = destination === 'mars';

  const isSol30 = state.currentSol >= state.totalSols;
  const isMissionCritical = state.missionStatus === 'critical';
  const isMissionVictory = state.missionStatus === 'victory' && !isMissionCritical;

  const toggleSubsystem = (subsystem: 'o2' | 'water' | 'power') => {
    setActiveSubsystem(activeSubsystem === subsystem ? null : subsystem);
  };

  return (
    <div className="space-y-7 animate-fadeIn pb-16">
      
      {/* 1. TOP FLIGHT DIRECTOR SOL BANNER */}
      <div className="relative rounded-3xl aerospace-hud p-6 sm:p-8 overflow-hidden">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Sol Counter & Daily Planetary Brief */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-bold tracking-widest flex items-center gap-1.5 shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>EXPEDITION SOL {state.currentSol} OF {state.totalSols}</span>
              </span>

              {isMissionVictory && (
                <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1 glow-emerald">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>30-SOL MISSION VICTORY ACHIEVED!</span>
                </span>
              )}

              {isMissionCritical && (
                <span className="px-3 py-1 rounded-full bg-red-950 border border-red-500 text-red-300 font-mono text-xs font-bold flex items-center gap-1 animate-pulse glow-red">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>CRITICAL ALERT: OPERATIONS HALTED</span>
                </span>
              )}

              <span className="text-xs font-mono text-slate-300 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                OUTPOST: <strong className={isMars ? 'text-amber-400' : 'text-cyan-300'}>{isMars ? 'ARES JEZERO BIOSPHERE' : 'SHACKLETON BASE CAMP'}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
              {state.currentEvent.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {state.currentEvent.description}
            </p>

            {/* Scientific Concept Tag */}
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300/90 pt-1">
              <span className="font-bold uppercase tracking-wider text-cyan-400 font-tech">Scientific Concept:</span>
              <span className="text-slate-300">{state.currentEvent.scientificConcept}</span>
            </div>
          </div>

          {/* Sol Advancement & Mission-State Protection Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* 1. Critical Failure State */}
            {isMissionCritical && (
              <div className="px-5 py-3.5 rounded-2xl bg-red-950/90 border border-red-500 text-red-200 font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg glow-red">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>Mission Failed: Life support threshold breached. Reset to retry.</span>
              </div>
            )}

            {/* 2. Victory State */}
            {isMissionVictory && (
              <div className="px-5 py-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg glow-emerald">
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Expedition Complete! 30-Sol Wings Conferred!</span>
              </div>
            )}

            {/* 3. Active Mission Advancement Button */}
            {!isMissionCritical && !isMissionVictory && !isSol30 && (
              <button
                onClick={onAdvanceSol}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white font-display font-black text-sm sm:text-base shadow-xl shadow-cyan-900/50 border border-cyan-300/50 flex items-center justify-center space-x-3 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer glow-cyan"
              >
                <span>EXECUTE SOL {state.currentSol} OPERATIONS</span>
                <ChevronRight className="w-5 h-5 text-cyan-200" />
              </button>
            )}

            {/* Reset Button (Always available, highlighted if critical) */}
            <button
              onClick={onResetSimulation}
              title="Reset Habitat to Sol 1"
              className={`px-4 py-3.5 rounded-2xl text-xs font-mono flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                isMissionCritical
                  ? 'bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/50 border border-red-400 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isMissionCritical ? 'Reset Mission' : 'Reset'}</span>
            </button>
          </div>

        </div>

        {/* 30-Sol Segmented Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Sol 1 (Touchdown)</span>
            <span className="text-cyan-300 font-bold font-mono">Progress: {Math.round((state.currentSol / state.totalSols) * 100)}%</span>
            <span>Sol 30 (Graduation)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isMissionCritical
                  ? 'bg-red-500 glow-red'
                  : isMissionVictory
                  ? 'bg-emerald-400 glow-emerald'
                  : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 glow-cyan'
              }`}
              style={{ width: `${(state.currentSol / state.totalSols) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Critical Alert Warning Card (if mission failed) */}
      {isMissionCritical && (
        <div className="p-6 rounded-3xl border-2 border-red-500 bg-red-950/80 backdrop-blur-xl text-red-200 space-y-2 shadow-2xl animate-fadeIn glow-red">
          <div className="flex items-center space-x-2 text-base font-bold text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>MISSION FAILED: Life Support Exhaustion or Hull Failure</span>
          </div>
          <p className="text-xs text-red-200/90 leading-relaxed font-sans">
            One or more vital habitat parameters dropped below survivable safety thresholds (Oxygen &le; 5%, Water &le; 5%, or Structural Integrity &le; 10%). Sol advancement has been locked to protect crew safety telemetry. Click the pulsing <strong>Reset Mission</strong> button above to re-initialize your habitat systems.
          </p>
        </div>
      )}

      {/* ================= FOUR CIRCULAR AEROSPACE RESOURCE INSTRUMENTS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Instrument 1: Oxygen */}
        <div className="space-y-2">
          <CircularGauge
            value={state.oxygenLevel}
            label="Oxygen (O₂)"
            subLabel={`Mode: ${state.o2Mode}`}
            color={state.oxygenLevel > 50 ? 'cyan' : 'red'}
            icon={Wind}
            statusText={state.oxygenLevel > 70 ? 'NOMINAL' : state.oxygenLevel > 30 ? 'CAUTION' : 'CRITICAL'}
            deltaText={calculations.o2Delta >= 0 ? `+${calculations.o2Delta}%/Sol` : `${calculations.o2Delta}%/Sol`}
            onClick={() => toggleSubsystem('o2')}
          />
          <div className="flex gap-2">
            <button
              onClick={onUseEmergencyO2}
              disabled={state.emergencyO2Canisters <= 0 || isMissionCritical}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors ${
                state.emergencyO2Canisters > 0 && !isMissionCritical
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shadow-md'
                  : 'bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>O₂ Canister (+25%) [{state.emergencyO2Canisters}]</span>
            </button>
            <button
              onClick={() => toggleSubsystem('o2')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 hover:text-white cursor-pointer"
              title="Toggle Subsystem Settings"
            >
              {activeSubsystem === 'o2' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Instrument 2: Water */}
        <div className="space-y-2">
          <CircularGauge
            value={state.waterLevel}
            label="Water (H₂O)"
            subLabel={`Loop: ${state.waterRecyclerMode}`}
            color={state.waterLevel > 50 ? 'blue' : 'red'}
            icon={Droplets}
            statusText={state.waterLevel > 70 ? 'NOMINAL' : state.waterLevel > 30 ? 'CAUTION' : 'CRITICAL'}
            deltaText={calculations.waterDelta >= 0 ? `+${calculations.waterDelta}%/Sol` : `${calculations.waterDelta}%/Sol`}
            onClick={() => toggleSubsystem('water')}
          />
          <div className="flex gap-2">
            <button
              onClick={onToggleIceSmelting}
              disabled={isMissionCritical}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                state.iceSmeltingActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Ice Smelter: {state.iceSmeltingActive ? 'ON (+7%)' : 'OFF'}</span>
            </button>
            <button
              onClick={() => toggleSubsystem('water')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-blue-300 hover:text-white cursor-pointer"
              title="Toggle Subsystem Settings"
            >
              {activeSubsystem === 'water' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Instrument 3: Power */}
        <div className="space-y-2">
          <CircularGauge
            value={state.batteryCharge}
            label="Battery Grid"
            subLabel={`${calculations.netPowerKw >= 0 ? `+${calculations.netPowerKw}` : calculations.netPowerKw} kW Net`}
            color={state.batteryCharge > 30 ? 'amber' : 'red'}
            icon={Zap}
            statusText={calculations.netPowerKw >= 0 ? 'CHARGING' : 'DRAINING'}
            deltaText={`${calculations.netPowerKw >= 0 ? `+${calculations.netPowerKw}` : calculations.netPowerKw} kW Flow`}
            onClick={() => toggleSubsystem('power')}
          />
          <div className="flex gap-2">
            <button
              onClick={onCleanSolarPanels}
              disabled={isMissionCritical}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer shadow-md"
            >
              <Brush className="w-3.5 h-3.5" />
              <span>Clean Wipers ({state.solarDustAccumulation}%)</span>
            </button>
            <button
              onClick={() => toggleSubsystem('power')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 hover:text-white cursor-pointer"
              title="Toggle Subsystem Settings"
            >
              {activeSubsystem === 'power' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Instrument 4: Temperature & Integrity */}
        <div className="space-y-2">
          <CircularGauge
            value={state.habitatIntegrity}
            label="Hull Integrity"
            subLabel={`Internal: ${state.habitatTempC}°C`}
            color={state.habitatIntegrity > 50 ? 'emerald' : 'red'}
            icon={Thermometer}
            statusText={state.habitatTempC >= 18 ? 'SEALED' : 'COLD STRESS'}
            deltaText={`Temp: ${state.habitatTempC}°C (Target: 21°C)`}
            onClick={() => toggleSubsystem('power')}
          />
          <div className="w-full py-2 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
            <span>Thermal Core:</span>
            <span className={`font-bold ${state.powerAllocation.thermalRegulation ? 'text-emerald-400' : 'text-red-400'}`}>
              {state.powerAllocation.thermalRegulation ? 'POWERED (21°C)' : 'OFFLINE'}
            </span>
          </div>
        </div>

      </div>

      {/* ================= POWER FLOW ARCHITECTURE SCHEMATIC ================= */}
      <div className="p-5 sm:p-6 rounded-3xl aerospace-hud space-y-4">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-tech font-bold uppercase tracking-wider text-slate-200">
              Electrical Grid Flow Architecture (Kilowatts)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            NET FLOW: <strong className={calculations.netPowerKw >= 0 ? 'text-emerald-400' : 'text-red-400'}>{calculations.netPowerKw >= 0 ? `+${calculations.netPowerKw} kW` : `${calculations.netPowerKw} kW`}</strong>
          </span>
        </div>

        {/* Flow Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs font-mono">
          
          {/* Generation Box */}
          <div className="lg:col-span-3 p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1">
            <div className="text-[10px] uppercase text-amber-400 font-bold">1. Solar Array Capture</div>
            <div className="text-base font-black text-white">{calculations.powerGenerated} kW</div>
            <div className="text-[10px] text-slate-400">Dust Loss: -{state.solarDustAccumulation}%</div>
          </div>

          <div className="hidden lg:flex lg:col-span-1 justify-center text-slate-500">
            <ArrowRight className="w-5 h-5 text-cyan-400" />
          </div>

          {/* Distribution Box */}
          <div className="lg:col-span-5 p-3.5 rounded-2xl bg-slate-950/80 border border-blue-500/30 space-y-1">
            <div className="text-[10px] uppercase text-cyan-400 font-bold">2. Subsystem Bus Distribution</div>
            <div className="text-base font-black text-white">{calculations.totalDemand} kW Total Demand</div>
            <div className="text-[10px] text-slate-400 flex flex-wrap gap-2">
              <span>O₂: {state.powerAllocation.lifeSupportO2 ? '25kW' : '0'}</span>
              <span>H₂O: {state.powerAllocation.waterRecycling ? '20kW' : '0'}</span>
              <span>Heat: {state.powerAllocation.thermalRegulation ? '20kW' : '0'}</span>
              <span>Lab: {state.powerAllocation.scienceLab ? '15kW' : '0'}</span>
              <span>Comms: {state.powerAllocation.communications ? '10kW' : '0'}</span>
            </div>
          </div>

          <div className="hidden lg:flex lg:col-span-1 justify-center text-slate-500">
            <ArrowRight className="w-5 h-5 text-cyan-400" />
          </div>

          {/* Battery Net Result Box */}
          <div className={`lg:col-span-2 p-3.5 rounded-2xl border space-y-1 ${
            calculations.netPowerKw >= 0
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-red-950/30 border-red-500/40'
          }`}>
            <div className="text-[10px] uppercase font-bold text-slate-300">3. Battery Balance</div>
            <div className={`text-base font-black ${calculations.netPowerKw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {calculations.netPowerKw >= 0 ? `+${calculations.netPowerKw} kW` : `${calculations.netPowerKw} kW`}
            </div>
            <div className="text-[10px] text-slate-300">{calculations.netPowerKw >= 0 ? 'CHARGING' : 'DRAINING'}</div>
          </div>

        </div>
      </div>

      {/* ================= EXPANDABLE SUBSYSTEM PANELS ================= */}
      {activeSubsystem && (
        <div className="p-6 rounded-3xl aerospace-hud space-y-5 animate-fadeIn">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Subsystem Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
                Advanced {activeSubsystem === 'o2' ? 'Oxygen Production' : activeSubsystem === 'water' ? 'ECLSS Water Recycling' : 'Electrical Grid Matrix'} Controls
              </h3>
            </div>
            <button
              onClick={() => setActiveSubsystem(null)}
              className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              Close Panel [X]
            </button>
          </div>

          {/* OXYGEN SUBSYSTEM */}
          {activeSubsystem === 'o2' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => !isMissionCritical && onSetO2Mode('eco')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    state.o2Mode === 'eco' ? 'border-cyan-400 bg-cyan-950/60 shadow-md glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="font-tech text-sm">Eco-Conservation</span>
                    {state.o2Mode === 'eco' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono mb-1.5">Demand: 15 kW • Net: -2%/Sol</div>
                  <p className="text-[11px] text-slate-300 font-sans">Saves power during dust storms. Crew breathes slightly conserved air.</p>
                </div>

                <div
                  onClick={() => !isMissionCritical && onSetO2Mode('standard')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    state.o2Mode === 'standard' ? 'border-cyan-400 bg-cyan-950/60 shadow-md glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="font-tech text-sm">Standard Mode</span>
                    {state.o2Mode === 'standard' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-[11px] text-emerald-300 font-mono mb-1.5">Demand: 25 kW • Net: +1%/Sol</div>
                  <p className="text-[11px] text-slate-300 font-sans">Balanced closed-loop recycling. Replenishes oxygen at nominal metabolic pace.</p>
                </div>

                <div
                  onClick={() => !isMissionCritical && onSetO2Mode('boost')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    state.o2Mode === 'boost' ? 'border-cyan-400 bg-cyan-950/60 shadow-md glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="font-tech text-sm">Max Boost Mode</span>
                    {state.o2Mode === 'boost' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-[11px] text-amber-300 font-mono mb-1.5">Demand: 35 kW • Net: +5%/Sol</div>
                  <p className="text-[11px] text-slate-300 font-sans">Runs compressors at peak capacity to rapidly refill reserve tanks.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>CO₂ Scrubbers (Lithium Hydroxide Canisters): {state.o2ScrubberEfficiency}% Efficient</span>
                </div>
                <span className="text-emerald-400 font-bold">ONLINE</span>
              </div>
            </div>
          )}

          {/* WATER SUBSYSTEM */}
          {activeSubsystem === 'water' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => !isMissionCritical && onSetWaterRecyclerMode('basic')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    state.waterRecyclerMode === 'basic' ? 'border-blue-400 bg-blue-950/60 shadow-md glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="font-tech text-sm">Basic Recycler</span>
                    {state.waterRecyclerMode === 'basic' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono mb-1.5">Demand: 10 kW • 75% Recovery</div>
                  <p className="text-[11px] text-slate-300 font-sans">Uses low power. Recommended when solar collection is reduced by dust.</p>
                </div>

                <div
                  onClick={() => !isMissionCritical && onSetWaterRecyclerMode('advanced')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    state.waterRecyclerMode === 'advanced' ? 'border-blue-400 bg-blue-950/60 shadow-md glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="font-tech text-sm">Advanced Catalytic</span>
                    {state.waterRecyclerMode === 'advanced' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-emerald-300 font-mono mb-1.5">Demand: 20 kW • 92% Recovery</div>
                  <p className="text-[11px] text-slate-300 font-sans">NASA standard closed loop. Multi-stage filtration guarantees ultra-clean water.</p>
                </div>

                <div
                  onClick={() => !isMissionCritical && onSetWaterRecyclerMode('hyper')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    state.waterRecyclerMode === 'hyper' ? 'border-blue-400 bg-blue-950/60 shadow-md glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                    <span className="font-tech text-sm">Hyper Vapor-Filter</span>
                    {state.waterRecyclerMode === 'hyper' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-amber-300 font-mono mb-1.5">Demand: 30 kW • 98% Recovery</div>
                  <p className="text-[11px] text-slate-300 font-sans">Recovers virtually 100% of all moisture in the habitat.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs font-mono text-slate-300 self-center mr-2">Crew Rationing:</span>
                {(['strict', 'standard', 'generous'] as WaterRation[]).map((ration) => (
                  <button
                    key={ration}
                    onClick={() => !isMissionCritical && onSetWaterRation(ration)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold capitalize transition-colors cursor-pointer ${
                      state.waterRation === ration
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ration} ({ration === 'strict' ? '-5%/Sol' : ration === 'standard' ? '-8%/Sol' : '-12%/Sol'})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* POWER SUBSYSTEM */}
          {activeSubsystem === 'power' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                <div
                  onClick={() => !isMissionCritical && onTogglePowerAllocation('lifeSupportO2')}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    state.powerAllocation.lifeSupportO2 ? 'bg-blue-950/60 border-cyan-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    <span>Life Support O₂ (25 kW)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.powerAllocation.lifeSupportO2 ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    {state.powerAllocation.lifeSupportO2 ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div
                  onClick={() => !isMissionCritical && onTogglePowerAllocation('waterRecycling')}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    state.powerAllocation.waterRecycling ? 'bg-blue-950/60 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span>Water Recycler (20 kW)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.powerAllocation.waterRecycling ? 'bg-blue-500 text-white font-black' : 'bg-slate-800 text-slate-400'}`}>
                    {state.powerAllocation.waterRecycling ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div
                  onClick={() => !isMissionCritical && onTogglePowerAllocation('thermalRegulation')}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    state.powerAllocation.thermalRegulation ? 'bg-blue-950/60 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-4 h-4 text-amber-400" />
                    <span>Thermal Heating (20 kW)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.powerAllocation.thermalRegulation ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    {state.powerAllocation.thermalRegulation ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div
                  onClick={() => !isMissionCritical && onTogglePowerAllocation('scienceLab')}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    state.powerAllocation.scienceLab ? 'bg-blue-950/60 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FlaskConical className="w-4 h-4 text-purple-400" />
                    <span>Science Lab (15 kW)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.powerAllocation.scienceLab ? 'bg-purple-500 text-white font-black' : 'bg-slate-800 text-slate-400'}`}>
                    {state.powerAllocation.scienceLab ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div
                  onClick={() => !isMissionCritical && onTogglePowerAllocation('communications')}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                    state.powerAllocation.communications ? 'bg-blue-950/60 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>DSN Comms (10 kW)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${state.powerAllocation.communications ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    {state.powerAllocation.communications ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Sol Debrief Message Banner */}
      <div className="p-4 rounded-2xl aerospace-hud flex items-start space-x-3 text-xs text-slate-200 shadow-md">
        <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300 font-bold block mb-0.5 font-tech">
            Mission Debrief Telemetry:
          </span>
          <p className="leading-relaxed font-sans">{state.lastDebriefMessage}</p>
        </div>
      </div>

    </div>
  );
};
