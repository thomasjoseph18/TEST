import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  HelpCircle,
  Volume2,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { NOVA_FACTS } from '../data/missions';
import { Destination, NavTab, MissionStatus } from '../types';

interface NovaCompanionProps {
  destination: Destination;
  currentSol?: number;
  lastDebriefMessage?: string;
  solTip?: string;
  activeTab?: NavTab;
  missionStatus?: MissionStatus;
}

export const NovaCompanion: React.FC<NovaCompanionProps> = ({
  destination,
  currentSol = 1,
  lastDebriefMessage,
  solTip,
  activeTab = 'home',
  missionStatus = 'active',
}) => {
  const [minimized, setMinimized] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const [activeSpeech, setActiveSpeech] = useState<string>(() => {
    return destination === 'mars'
      ? "Greetings, Junior Commander! I'm N.O.V.A., your AI Mission Copilot! Ares Jezero Outpost is sealed and ready for Sol 1. I'm monitoring life support telemetry!"
      : "Greetings, Junior Commander! I'm N.O.V.A., your AI Mission Copilot! Shackleton Base Camp is sealed and ready for Sol 1. I'm monitoring life support telemetry!";
  });
  const [speakingAnimation, setSpeakingAnimation] = useState(false);

  // Sync NOVA when Sol advances or mission state changes
  useEffect(() => {
    if (missionStatus === 'critical') {
      setActiveSpeech(
        `🚨 MISSION ALERT (Sol ${currentSol}): Environmental limits breached! Life support or habitat integrity collapsed. Review the flight log and reset simulation to retry with better power and resource balancing.`
      );
      triggerSpeechAnimation();
      return;
    }

    if (missionStatus === 'victory') {
      setActiveSpeech(
        `🎉 MISSION SUCCESS! Commander, you completed all 30 Sols on ${destination === 'mars' ? 'Mars' : 'the Moon'}! You have earned your 30-Sol Expedition Wings and mastered closed-loop life support!`
      );
      triggerSpeechAnimation();
      return;
    }

    if (lastDebriefMessage) {
      setActiveSpeech(`Sol ${currentSol} Report: ${lastDebriefMessage}`);
      triggerSpeechAnimation();
    }
  }, [currentSol, lastDebriefMessage, missionStatus, destination]);

  // Contextual tips based on active navigation tab
  useEffect(() => {
    if (activeTab === 'exploration') {
      setActiveSpeech(
        `EVA Exploration Mode: Survey all geological landmarks on ${destination === 'mars' ? 'Mars' : 'the Moon'} to unlock the Planetary Geologist merit badge!`
      );
      triggerSpeechAnimation();
    } else if (activeTab === 'achievements') {
      setActiveSpeech(
        "Astronaut Honor Room: Track your mission badges here! Try different engineering modes in the Habitat deck to unlock them all."
      );
      triggerSpeechAnimation();
    } else if (activeTab === 'habitat') {
      if (solTip) {
        setActiveSpeech(`Habitat Deck (Sol ${currentSol}): ${solTip}`);
        triggerSpeechAnimation();
      }
    }
  }, [activeTab]);

  const triggerSpeechAnimation = () => {
    setSpeakingAnimation(true);
    setTimeout(() => setSpeakingAnimation(false), 1200);
  };

  const handleNextFact = () => {
    const nextIdx = (factIndex + 1) % NOVA_FACTS.length;
    setFactIndex(nextIdx);
    setActiveSpeech(`Space Fact #${nextIdx + 1}: ${NOVA_FACTS[nextIdx]}`);
    triggerSpeechAnimation();
  };

  const handleSolAdvice = () => {
    if (solTip) {
      setActiveSpeech(`Sol ${currentSol} Tactical Tip: ${solTip}`);
    } else if (destination === 'moon') {
      setActiveSpeech(
        "Lunar Operations Tip: Shadows at the lunar South Pole are super long and dark because the sun is always hugging the horizon! Always keep your suit lights and battery charged!"
      );
    } else {
      setActiveSpeech(
        "Mars Operations Tip: Dust on Mars is very fine iron oxide! Make sure the airlock electro-scrubber is running before stepping inside the pressurized habitat dome!"
      );
    }
    triggerSpeechAnimation();
  };

  const isAlert = missionStatus === 'critical';
  const isVictory = missionStatus === 'victory';

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden shadow-2xl ${
        isAlert
          ? 'border-red-500/60 bg-[#1c0b11]/95 shadow-red-950/60'
          : isVictory
          ? 'border-amber-400/60 bg-[#1b1509]/95 shadow-amber-950/60'
          : 'border-cyan-500/40 bg-[#09152e]/92 shadow-cyan-950/40'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isAlert
            ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-red-500/40'
            : isVictory
            ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 border-amber-500/40'
            : 'bg-gradient-to-r from-blue-950 via-[#0B1E47] to-cyan-950/80 border-cyan-500/30'
        }`}
      >
        <div className="flex items-center space-x-3">
          {/* Animated NOVA Robot Head */}
          <div
            className={`relative w-8 h-8 rounded-full border flex items-center justify-center shadow-md ${
              isAlert
                ? 'bg-red-500/20 border-red-400 text-red-300 shadow-red-500/30'
                : isVictory
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/30'
                : 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/30'
            }`}
          >
            {isAlert ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : isVictory ? (
              <Trophy className="w-4 h-4 text-amber-300" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                isAlert ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                isAlert ? 'bg-red-600' : 'bg-emerald-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black tracking-wider text-white">N.O.V.A.</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                  isAlert
                    ? 'bg-red-950 border-red-500/50 text-red-300'
                    : isVictory
                    ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                    : 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                }`}
              >
                {isAlert ? 'CRITICAL ALERT' : isVictory ? 'MISSION VICTORY' : 'AI COPILOT'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-cyan-200/70 hidden sm:block">
              Navigational Operations &amp; Versatile Assistant
            </p>
          </div>
        </div>

        {/* Minimize / Expand Toggle */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 rounded-md text-cyan-300 hover:text-white hover:bg-cyan-900/50 transition-colors cursor-pointer"
            title={minimized ? 'Expand NOVA' : 'Minimize NOVA'}
          >
            {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Area */}
      {!minimized && (
        <div className="p-4 space-y-3">
          {/* Speech Bubble */}
          <div
            className={`relative rounded-xl border p-3.5 text-xs leading-relaxed shadow-inner ${
              isAlert
                ? 'bg-red-950/40 border-red-500/40 text-red-100'
                : isVictory
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                : 'bg-slate-950/70 border-cyan-500/30 text-slate-200'
            }`}
          >
            <div className="flex items-start space-x-2">
              <MessageSquare
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isAlert
                    ? 'text-red-400'
                    : isVictory
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                } ${speakingAnimation ? 'animate-bounce' : ''}`}
              />
              <div className="space-y-1">
                <span
                  className={`text-[10px] uppercase font-mono tracking-widest font-bold block ${
                    isAlert
                      ? 'text-red-400'
                      : isVictory
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {isAlert ? 'Emergency Broadcast:' : 'Transmission from NOVA:'}
                </span>
                <p className="text-xs sm:text-[13px] font-medium">
                  {activeSpeech}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Interactive Actions for Children */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleNextFact}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 border border-blue-400/40 text-white text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Space Fact</span>
            </button>

            <button
              onClick={handleSolAdvice}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-200 text-xs font-semibold transition-transform active:scale-95 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sol {currentSol} Tips</span>
            </button>

            <button
              onClick={triggerSpeechAnimation}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
              title="Voice Synthesizer Test"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono">Audio Check</span>
            </button>
          </div>
        </div>
      )}

      {/* Minimized Pill Preview */}
      {minimized && (
        <div
          onClick={() => setMinimized(false)}
          className={`px-4 py-2 text-xs font-mono flex items-center justify-between cursor-pointer ${
            isAlert
              ? 'text-red-300 bg-red-950/60 hover:bg-red-950/80'
              : 'text-cyan-300 hover:bg-cyan-950/40'
          }`}
        >
          <span className="truncate">
            {isAlert
              ? `🚨 N.O.V.A.: Critical Alert on Sol ${currentSol}!`
              : `N.O.V.A. (Sol ${currentSol}) Standing by...`}
          </span>
          <span className="text-[10px] text-cyan-400 underline font-sans ml-2">Click to expand</span>
        </div>
      )}
    </div>
  );
};
