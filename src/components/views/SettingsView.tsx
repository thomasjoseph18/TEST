import React from 'react';
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Bot,
  Type,
  Gauge,
  User,
  ShieldCheck,
  CheckCircle2,
  Accessibility,
  Captions,
  Rocket,
} from 'lucide-react';
import { SettingsConfig } from '../../types';

interface SettingsViewProps {
  settings: SettingsConfig;
  onUpdateSettings: (newSettings: Partial<SettingsConfig>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#06122d]/95 via-[#081a3d]/90 to-[#040e24]/95 p-6 sm:p-7 backdrop-blur-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-13 h-13 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
            <SettingsIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold">
                FLIGHT DECK CONFIGURATION
              </span>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                SYSTEM PREFERENCES
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Astronaut Trainer Settings
            </h1>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
          <CheckCircle2 className="w-4 h-4" />
          <span>CONFIG SYNCHRONIZED</span>
        </div>
      </div>

      {/* Settings Panel Grid */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#070F2B]/90 backdrop-blur-xl space-y-6 shadow-xl">
        
        {/* Astronaut Call-Sign */}
        <div className="space-y-2.5 pb-6 border-b border-slate-800/80">
          <label className="flex items-center space-x-2 text-xs font-mono font-bold text-cyan-300">
            <User className="w-4 h-4 text-cyan-400" />
            <span>ASTRONAUT CALL-SIGN / CADET NAME</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={settings.callSign}
              onChange={(e) => onUpdateSettings({ callSign: e.target.value })}
              className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono font-medium focus:outline-none focus:border-cyan-400 shadow-inner"
              placeholder="e.g. Commander Armstrong"
            />
            <span className="text-xs text-slate-400 self-center">
              Stamped onto all Sol flight journal records and mission graduation certificates.
            </span>
          </div>
        </div>

        {/* Audio Effects */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              {settings.audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>SPACECRAFT AUDIO &amp; RADIO ACOUSTICS</span>
            </div>
            <p className="text-xs text-slate-400">
              Play Apollo thruster soundscapes, airlock pressure equalization, and telemetry radio beeps.
            </p>
          </div>
          <button
            onClick={() => onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
              settings.audioEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            {settings.audioEnabled ? 'SOUND EFFECTS: ON' : 'SOUND EFFECTS: MUTED'}
          </button>
        </div>

        {/* NOVA Voice Companion */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>N.O.V.A. COPILOT SPEECH SYNTHESIZER</span>
            </div>
            <p className="text-xs text-slate-400">
              Enable N.O.V.A. to synthesize tactical advice, emergency alerts, and STEM space facts aloud.
            </p>
          </div>
          <button
            onClick={() => onUpdateSettings({ novaVoiceEnabled: !settings.novaVoiceEnabled })}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
              settings.novaVoiceEnabled
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            {settings.novaVoiceEnabled ? 'VOICE COPILOT: ACTIVE' : 'VOICE COPILOT: OFF'}
          </button>
        </div>

        {/* Text Size Accessibility */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Type className="w-4 h-4 text-cyan-400" />
              <span>INTERFACE TYPOGRAPHY SCALE</span>
            </div>
            <p className="text-xs text-slate-400">
              Adjust text sizing for classroom displays, tablets, or junior readers (ages 7–9).
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdateSettings({ textSize: 'normal' })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.textSize === 'normal'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Standard Scale
            </button>
            <button
              onClick={() => onUpdateSettings({ textSize: 'large' })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.textSize === 'large'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Large Text (Ages 7–9)
            </button>
          </div>
        </div>

        {/* Graphics Performance Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>3D GRAPHICS PERFORMANCE ACCELERATION</span>
            </div>
            <p className="text-xs text-slate-400">
              Adaptive canvas pixel ratio for classroom Chromebooks, mobile devices, and high-performance desktop displays.
            </p>
          </div>
          <button
            onClick={() => onUpdateSettings({ lowPerformanceMode: !settings.lowPerformanceMode })}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
              settings.lowPerformanceMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
            }`}
          >
            {settings.lowPerformanceMode ? 'BATTERY SAVER (30 FPS)' : 'MAX QUALITY (60 FPS)'}
          </button>
        </div>


        {/* Reduced motion */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Accessibility className="w-4 h-4 text-cyan-400" />
              <span>REDUCED MOTION</span>
            </div>
            <p className="text-xs text-slate-400">Calms camera movement and non-essential animation. Starts on automatically if your device asks for it.</p>
          </div>
          <button
            role="switch"
            aria-checked={settings.reducedMotion}
            onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${settings.reducedMotion ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
          >
            {settings.reducedMotion ? 'REDUCED MOTION: ON' : 'REDUCED MOTION: OFF'}
          </button>
        </div>

        {/* Captions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Captions className="w-4 h-4 text-cyan-400" />
              <span>CAPTIONS</span>
            </div>
            <p className="text-xs text-slate-400">Show text for radio chatter, N.O.V.A. and story scenes.</p>
          </div>
          <button
            role="switch"
            aria-checked={settings.captionsEnabled}
            onClick={() => onUpdateSettings({ captionsEnabled: !settings.captionsEnabled })}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${settings.captionsEnabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
          >
            {settings.captionsEnabled ? 'CAPTIONS: ON' : 'CAPTIONS: OFF'}
          </button>
        </div>

        {/* Master volume */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
          <label htmlFor="master-volume" className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>MASTER VOLUME ({Math.round(settings.masterVolume * 100)}%)</span>
            </div>
            <p className="text-xs text-slate-400">Applies to the game audio coming in later phases.</p>
          </label>
          <input
            id="master-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.masterVolume * 100)}
            onChange={(e) => onUpdateSettings({ masterVolume: Number(e.target.value) / 100 })}
            className="w-full sm:w-56 accent-cyan-400"
          />
        </div>

        {/* Experience mode (temporary classic switch) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-200">
              <Rocket className="w-4 h-4 text-cyan-400" />
              <span>EXPERIENCE MODE</span>
            </div>
            <p className="text-xs text-slate-400">Classic is the original dashboard. Game is the new first-person experience (still being built). Your saved progress is shared by both.</p>
          </div>
          <div className="flex items-center space-x-2">
            {(['classic', 'game'] as const).map((m) => (
              <button
                key={m}
                aria-pressed={settings.uiMode === m}
                onClick={() => onUpdateSettings({ uiMode: m })}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${settings.uiMode === m ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
              >
                {m === 'classic' ? 'Classic Mode' : 'Game Mode (preview)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Safety & Educational Privacy Badge */}
      <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center space-x-3 text-xs text-slate-300 font-mono">
        <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        <span>
          <strong>NASA STEM Education Safe:</strong> Fully client-side offline execution. Zero tracking, zero ads, and strict student privacy compliance.
        </span>
      </div>

    </div>
  );
};
