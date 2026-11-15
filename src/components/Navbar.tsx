import React, { useState } from 'react';
import {
  Rocket,
  Compass,
  ShieldCheck,
  Globe2,
  BookOpen,
  Award,
  Settings as SettingsIcon,
  Menu,
  X,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';
import { NavTab } from '../types';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentSol: number;
  totalSols: number;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  currentSol,
  totalSols,
  audioEnabled,
  onToggleAudio,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Rocket },
    { id: 'missions', label: 'Missions', icon: Compass },
    { id: 'habitat', label: 'Habitat Deck', icon: ShieldCheck },
    { id: 'exploration', label: 'Surface EVA', icon: Globe2 },
    { id: 'journal', label: 'Mission Logs', icon: BookOpen },
    { id: 'achievements', label: 'Merit Badges', icon: Award },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="relative z-30 w-full border-b border-cyan-500/25 bg-slate-950/92 backdrop-blur-xl text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* NASA-inspired Logo & Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer flex-shrink-0 group"
            onClick={() => handleSelectTab('home')}
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-cyan-600 to-sky-400 p-0.5 shadow-md shadow-cyan-950/80 flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-full h-full rounded-[14px] bg-[#020617] flex items-center justify-center overflow-hidden relative">
                <Rocket className="w-5 h-5 text-cyan-300 relative z-10" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] tracking-widest font-mono uppercase text-cyan-400 font-bold font-tech">
                  NASA • JUNIOR ASTRONAUT CADET
                </span>
              </div>
              <div className="text-sm sm:text-base font-display font-black tracking-wider text-white flex items-center gap-1.5">
                <span>BUILDSCAPES</span>
                <span className="text-[11px] font-semibold text-blue-300 font-mono hidden xl:inline">
                  | Apollo to Artemis
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (7 items) */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3 xl:px-3.5 py-2 rounded-xl text-xs font-tech font-bold tracking-wider transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-950/60 border border-cyan-400/50 glow-cyan'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="uppercase">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Status Controls */}
          <div className="hidden sm:flex items-center space-x-3 flex-shrink-0">
            {/* Sol Counter Badge */}
            <div
              onClick={() => handleSelectTab('habitat')}
              title="Click to view Habitat Dashboard"
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-500/50 shadow-inner cursor-pointer hover:border-cyan-400 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-300">
                SOL {currentSol} OF {totalSols}
              </span>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={onToggleAudio}
              title={audioEnabled ? 'Mute Mission Audio' : 'Unmute Mission Audio'}
              className="p-2 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors cursor-pointer"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Live Comms Indicator */}
            <div className="hidden 2xl:flex items-center space-x-1.5 text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-3">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>DSN TELEMETRY: 100%</span>
            </div>
          </div>

          {/* Mobile / Tablet Menu Button */}
          <div className="flex items-center space-x-2 lg:hidden">
            <div
              onClick={() => handleSelectTab('habitat')}
              className="px-2.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300 cursor-pointer"
            >
              SOL {currentSol}/{totalSols}
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-750 text-slate-200 hover:text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5 text-cyan-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-1.5 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-tech font-bold tracking-wider transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-black'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                <span className="uppercase">{item.label}</span>
              </button>
            );
          })}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Mission Audio SFX</span>
            <button
              onClick={onToggleAudio}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 cursor-pointer"
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{audioEnabled ? 'Active' : 'Muted'}</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
