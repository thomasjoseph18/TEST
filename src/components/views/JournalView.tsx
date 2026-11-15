import React, { useState } from 'react';
import {
  BookOpen,
  Award,
  Sparkles,
  Calendar,
  Send,
  Rocket,
  BatteryCharging,
  Info,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Droplets,
  Zap,
  Thermometer,
  ShieldCheck,
  User,
  Layers,
} from 'lucide-react';
import { JournalEntry, Destination } from '../../types';

interface JournalViewProps {
  destination: Destination;
  currentSol: number;
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  destination,
  currentSol,
  entries,
  onAddEntry,
}) => {
  const [customNote, setCustomNote] = useState('');
  const [authorName, setAuthorName] = useState('Cadet Commander');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'milestones' | 'observations'>('all');

  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNote.trim()) return;

    const newEntry: JournalEntry = {
      id: `entry-${Date.now()}`,
      sol: currentSol,
      title: `Cadet Sol ${currentSol} Surface Observation`,
      author: authorName,
      timestamp: `Sol ${currentSol} - Field Log`,
      body: customNote,
      outcomeStatus: 'nominal',
      scientificLearningPoint: 'Active field documentation enables mission ground support teams to track scientific anomalies across Sols.',
      badge: {
        name: 'Curious Explorer Pin',
        icon: 'Award',
        description: `Recorded an official Sol ${currentSol} scientific observation in the flight journal.`,
      },
      scienceTip: 'Astronauts write field logs every single Sol so scientists on Earth can analyze planetary discoveries!',
    };

    onAddEntry(newEntry);
    setCustomNote('');
  };

  const getBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Rocket':
        return <Rocket className="w-5 h-5 text-cyan-400" />;
      case 'BatteryCharging':
        return <BatteryCharging className="w-5 h-5 text-emerald-400" />;
      default:
        return <Award className="w-5 h-5 text-amber-400" />;
    }
  };

  const getOutcomeBadge = (status?: string) => {
    switch (status) {
      case 'victory':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>MISSION VICTORY</span>
          </span>
        );
      case 'critical':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950 border border-red-500 text-red-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>CRITICAL FAULT</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>CAUTION</span>
          </span>
        );
      case 'nominal':
      default:
        return (
          <span className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>NOMINAL</span>
          </span>
        );
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (selectedFilter === 'milestones') return Boolean(entry.badge);
    if (selectedFilter === 'observations') return entry.title.includes('Observation');
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-10">
      
      {/* Flight Archive Header */}
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#06122d]/95 via-[#081b3e]/90 to-[#040e24]/95 p-6 sm:p-7 backdrop-blur-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-13 h-13 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold">
                FLIGHT DIRECTOR ARCHIVES
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60 font-bold">
                SOL {currentSol} OF 30 ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Official Mission Journal
            </h1>
          </div>
        </div>

        <div className="text-xs text-slate-300 font-mono bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl self-start sm:self-center">
          OUTPOST: <span className="text-cyan-300 font-bold uppercase">{destination === 'mars' ? 'Ares Jezero Outpost' : 'Shackleton Base Camp'}</span>
        </div>
      </div>

      {/* Interactive Cadet Field Note Form */}
      <div className="p-6 rounded-3xl border border-blue-500/30 bg-slate-900/80 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-cyan-300 text-sm font-bold">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Record a Sol {currentSol} Surface Observation</span>
        </div>
        <p className="text-xs text-slate-300">
          Document your habitat decisions, scientific measurements, or what you observed outside the airlock.
        </p>

        <form onSubmit={handleAddObservation} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Astronaut Call-Sign"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Cleared 15% regolith dust from the solar array. Battery charge returned to +12 kW surplus!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Record Flight Log Entry</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono text-slate-400 mr-2">Filter Logs:</span>
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            selectedFilter === 'all'
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Entries ({entries.length})
        </button>
        <button
          onClick={() => setSelectedFilter('milestones')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            selectedFilter === 'milestones'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Milestones &amp; Badges
        </button>
        <button
          onClick={() => setSelectedFilter('observations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            selectedFilter === 'observations'
              ? 'bg-cyan-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Cadet Observations
        </button>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="p-6 rounded-3xl border border-slate-800 bg-[#070F2B]/90 backdrop-blur-xl space-y-4 shadow-xl hover:border-slate-700 transition-all"
          >
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-black">
                  SOL {entry.sol}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white">{entry.title}</h2>
              </div>
              <div className="flex items-center space-x-2.5">
                {getOutcomeBadge(entry.outcomeStatus)}
                <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{entry.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Author */}
            <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2">
              <span>Transmitted by:</span>
              <strong className="text-slate-200">{entry.author}</strong>
            </div>

            {/* Body */}
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              {entry.body}
            </p>

            {/* Resource Telemetry Snapshot (if recorded on this Sol) */}
            {entry.resourceSummary && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sol {entry.sol} Telemetry Snapshot:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                  <div className="flex items-center space-x-1.5 text-cyan-300">
                    <Wind className="w-3.5 h-3.5" />
                    <span>O₂: {entry.resourceSummary.o2}%</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-blue-300">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>H₂O: {entry.resourceSummary.water}%</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-amber-300">
                    <Zap className="w-3.5 h-3.5" />
                    <span>PWR: {entry.resourceSummary.power}%</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-200">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>TEMP: {entry.resourceSummary.temp}°C</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>HULL: {entry.resourceSummary.integrity}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scientific Concept Learning Point */}
            {entry.scientificLearningPoint && (
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 leading-relaxed flex items-start space-x-2">
                <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300 font-mono text-[10px] uppercase block">STEM Learning Point:</strong>
                  <span>{entry.scientificLearningPoint}</span>
                </div>
              </div>
            )}

            {/* Badge Earned Pill (if any) */}
            {entry.badge && (
              <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200">
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-400/60 flex items-center justify-center flex-shrink-0 shadow-md">
                  {getBadgeIcon(entry.badge.icon)}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Badge Earned:</span>
                    <span>{entry.badge.name}</span>
                  </div>
                  <div className="text-xs text-amber-200/90">{entry.badge.description}</div>
                </div>
              </div>
            )}

            {/* Science Tip */}
            {entry.scienceTip && (
              <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-cyan-200 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span>{entry.scienceTip}</span>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};
