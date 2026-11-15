import React, { useState } from 'react';
import {
  Compass,
  Globe2,
  Sun,
  Droplets,
  Rocket,
  Wind,
  Zap,
  Flame,
  MapPin,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Layers,
  ChevronRight,
  Info,
  Crosshair,
} from 'lucide-react';
import { Destination, ExplorationPoint } from '../../types';
import { EXPLORATION_POINTS } from '../../data/exploration';

interface ExplorationViewProps {
  destination: Destination;
  onSelectDestination?: (dest: Destination) => void;
  /** Sites the player has VIEWED (informational only; viewing never unlocks achievements). */
  exploredIds: string[];
  onSiteViewed: (siteId: string) => void;
  onNavigateToHabitat?: () => void;
  onNavigateToPOV?: () => void;
}

export const ExplorationView: React.FC<ExplorationViewProps> = ({
  destination,
  onSelectDestination,
  exploredIds,
  onSiteViewed,
  onNavigateToHabitat,
  onNavigateToPOV,
}) => {
  const [activeDest, setActiveDest] = useState<Destination>(destination);
  const sites = EXPLORATION_POINTS.filter((p) => p.destination === activeDest);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || '');

  const activeSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  const handleInspectSite = (site: ExplorationPoint) => {
    setSelectedSiteId(site.id);
    onSiteViewed(site.id);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sun':
        return <Sun className="w-5 h-5 text-amber-400" />;
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-cyan-400" />;
      case 'Rocket':
        return <Rocket className="w-5 h-5 text-blue-400" />;
      case 'Wind':
        return <Wind className="w-5 h-5 text-sky-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'Globe2':
        return <Globe2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Compass className="w-5 h-5 text-indigo-400" />;
    }
  };

  const isMars = activeDest === 'mars';
  const totalExploredInDest = sites.filter((s) => exploredIds.includes(s.id)).length;
  const progressPercent = Math.round((totalExploredInDest / sites.length) * 100);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">

      {/* ── IMMERSIVE POV LAUNCH BANNER ── */}
      {!isMars && onNavigateToPOV && (
        <div className="dest-card-moon rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
          <div className="relative z-10 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              🌕 LUNAR SURFACE · FIRST-PERSON EVA MODE
            </div>
            <h2 className="font-display font-black text-white text-xl">
              Enter Immersive Lunar POV
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Walk the lunar surface, visit all 4 exploration sites in first-person, and unlock merit badges.
            </p>
          </div>
          <button
            onClick={onNavigateToPOV}
            className="relative z-10 flex-shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-black text-sm shadow-xl shadow-cyan-900/50 glow-cyan transition-all cursor-pointer active:scale-95"
          >
            <Crosshair className="w-5 h-5" />
            <span>ENTER LUNAR POV</span>
          </button>
        </div>
      )}

      {isMars && onNavigateToPOV && (
        <div className="dest-card-mars rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />
          <div className="relative z-10 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold">
              🔴 MARS SURFACE · JEZERO CRATER
            </div>
            <h2 className="font-display font-black text-white text-xl">
              Enter Immersive Mars POV
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Walk the Martian surface in first-person, visit all 4 exploration sites, and unlock merit badges.
            </p>
          </div>
          <button
            onClick={onNavigateToPOV}
            className="relative z-10 flex-shrink-0 flex items-center gap-3 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-display font-black text-sm shadow-xl shadow-orange-900/50 glow-orange transition-all cursor-pointer active:scale-95"
          >
            <Crosshair className="w-5 h-5" />
            <span>ENTER MARS POV</span>
          </button>
        </div>
      )}

      {/* 1. TOP EVA FLIGHT HEADER BANNER */}
      <div className={`p-6 sm:p-8 rounded-3xl relative overflow-hidden ${isMars ? 'aerospace-hud-mars' : 'aerospace-hud'}`}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`p-2.5 rounded-xl border ${isMars ? 'bg-amber-950/80 border-amber-500/40 text-amber-400' : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'}`}>
                <Crosshair className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300 font-bold uppercase">
                    EVA SURFACE RADAR
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                    isMars ? 'bg-amber-950 border-amber-500/40 text-amber-300' : 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                  }`}>
                    {isMars ? 'JEZERO QUADRANGLE' : 'SHACKLETON QUADRANGLE'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                  Planetary Surface Exploration Terminal
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-2xl">
              Survey extraterrestrial geological landmarks, sample ancient lakebed sediments and cryogenic cold traps, and inspect historical Apollo and Perseverance landing zones.
            </p>
          </div>

          {/* Destination Selector Pill */}
          <div className="flex items-center space-x-2 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-center shadow-lg">
            <button
              onClick={() => {
                setActiveDest('moon');
                const moonFirst = EXPLORATION_POINTS.find((p) => p.destination === 'moon');
                if (moonFirst) setSelectedSiteId(moonFirst.id);
                if (onSelectDestination) onSelectDestination('moon');
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-tech font-bold tracking-wider transition-all cursor-pointer ${
                !isMars
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌕 Moon (Artemis Base)</span>
            </button>

            <button
              onClick={() => {
                setActiveDest('mars');
                const marsFirst = EXPLORATION_POINTS.find((p) => p.destination === 'mars');
                if (marsFirst) setSelectedSiteId(marsFirst.id);
                if (onSelectDestination) onSelectDestination('mars');
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-tech font-bold tracking-wider transition-all cursor-pointer ${
                isMars
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔴 Mars (Jezero Crater)</span>
            </button>
          </div>
        </div>

        {/* Survey Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-slate-300">
              Sector Geological Survey:{' '}
              <strong className={isMars ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
                {totalExploredInDest} of {sites.length} Landmarks Analyzed
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 flex-1 sm:max-w-xs">
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isMars ? 'bg-gradient-to-r from-amber-500 to-orange-400 glow-amber' : 'bg-gradient-to-r from-cyan-500 to-blue-400 glow-cyan'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={`text-xs font-mono font-bold min-w-[3rem] ${isMars ? 'text-amber-300' : 'text-cyan-300'}`}>
              {progressPercent}%
            </span>
          </div>

          {/* Lunar POV Entry — Moon only */}
          {!isMars && onNavigateToPOV && (
            <button
              onClick={onNavigateToPOV}
              className="flex items-center space-x-2.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-display font-bold text-xs shadow-lg shadow-cyan-900/50 glow-cyan transition-all cursor-pointer flex-shrink-0"
            >
              <Crosshair className="w-4 h-4" />
              <span>🌕 ENTER LUNAR POV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN EXPLORATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">        
        {/* Left Column: List of Sites */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold font-tech">
              {isMars ? 'Martian Quadrangle Coordinates' : 'Lunar Polar Coordinates'}
            </span>
            <span className={`text-[11px] font-mono font-bold ${isMars ? 'text-amber-400' : 'text-cyan-400'}`}>
              {sites.length} Target Vectors
            </span>
          </div>

          <div className="space-y-3">
            {sites.map((site) => {
              const isExplored = exploredIds.includes(site.id);
              const isSelected = activeSite?.id === site.id;

              return (
                <button
                  key={site.id}
                  onClick={() => handleInspectSite(site)}
                  className={`w-full text-left p-4.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between group relative overflow-hidden ${
                    isSelected
                      ? isMars
                        ? 'border-amber-400 aerospace-hud-mars shadow-xl shadow-amber-950/40 scale-[1.01]'
                        : 'border-cyan-400 aerospace-hud shadow-xl shadow-cyan-950/40 scale-[1.01]'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`p-3 rounded-xl border flex-shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected
                          ? isMars
                            ? 'bg-amber-500/20 border-amber-400/60'
                            : 'bg-cyan-500/20 border-cyan-400/60'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {renderIcon(site.icon)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-display font-bold text-white group-hover:text-cyan-200 transition-colors">
                          {site.title}
                        </h2>
                        {isExplored && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-cyan-300 font-semibold truncate max-w-[210px] sm:max-w-xs">
                        COORD: {site.coordinates}
                      </p>
                      <p className="text-xs text-slate-300 line-clamp-1 font-sans">
                        {site.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 mt-2 transition-transform ${
                      isSelected ? (isMars ? 'text-amber-400 translate-x-1' : 'text-cyan-400 translate-x-1') : 'text-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Scientific Dossier */}
        <div className="lg:col-span-7">
          {activeSite ? (
            <div className={`p-6 sm:p-7 rounded-3xl relative overflow-hidden space-y-6 ${isMars ? 'aerospace-hud-mars' : 'aerospace-hud'}`}>
              <div className="hud-corner-tl" />
              <div className="hud-corner-tr" />
              <div className="hud-corner-bl" />
              <div className="hud-corner-br" />

              {/* Site Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30">
                      {renderIcon(activeSite.icon)}
                    </span>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-display font-black text-white">
                        {activeSite.title}
                      </h2>
                      <p className="text-xs font-mono font-bold text-cyan-300 font-tech">
                        {activeSite.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-center">
                  <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 flex items-center space-x-1.5 shadow-inner">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{activeSite.coordinates}</span>
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-4.5 rounded-2xl border border-slate-800/80 font-sans">
                {activeSite.description}
              </div>

              {/* Scientific Significance Card */}
              <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-blue-400">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xs font-tech font-bold uppercase tracking-wider">
                    Scientific Significance &amp; Research Potential
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {activeSite.scientificSignificance}
                </p>
              </div>

              {/* NASA & Artemis Connection Card */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Rocket className="w-4 h-4" />
                  <span className="text-xs font-tech font-bold uppercase tracking-wider">
                    NASA Mission &amp; Flight Connection
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {activeSite.nasaConnection}
                </p>
              </div>

              {/* Junior Astronaut STEM Discovery Fact */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-tech font-bold uppercase tracking-wider">
                    Cadet Field Discovery Fact
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed font-sans font-medium">
                  {activeSite.interactiveFact}
                </p>
              </div>

              {/* Action Button: Log Survey */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>
                    Merit Badge Link: <strong className="text-cyan-300 font-mono font-bold">{activeSite.badgeName}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => handleInspectSite(activeSite)}
                    className={`flex-1 sm:flex-none flex items-center justify-center space-x-2.5 px-6 py-3 rounded-xl font-display font-bold text-xs shadow-xl transition-all cursor-pointer ${
                      exploredIds.includes(activeSite.id)
                        ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300 glow-emerald'
                        : isMars
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/50 glow-amber'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/50 glow-cyan'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {exploredIds.includes(activeSite.id)
                        ? 'GEOLOGICAL SURVEY LOGGED ✓'
                        : 'LOG GEOLOGICAL SURVEY'}
                    </span>
                  </button>

                  {onNavigateToHabitat && (
                    <button
                      onClick={onNavigateToHabitat}
                      className="px-4.5 py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-tech font-bold text-xs tracking-wider transition-colors cursor-pointer"
                    >
                      RETURN TO DECK
                    </button>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-3xl aerospace-hud p-12 text-center text-slate-400 font-mono">
              Select an exploration landmark from the left column to begin surface survey.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
