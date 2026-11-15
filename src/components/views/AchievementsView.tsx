import React, { useState } from 'react';
import {
  Award,
  Trophy,
  CheckCircle2,
  Lock,
  Sparkles,
  Droplets,
  Wind,
  Zap,
  Flame,
  Brush,
  Compass,
  Rocket,
  Globe2,
  Filter,
} from 'lucide-react';
import { Achievement } from '../../types';

interface AchievementsViewProps {
  achievements: Achievement[];
  currentSol?: number;
  onNavigateToHabitat?: () => void;
}

type CategoryFilter = 'all' | 'survival' | 'engineering' | 'milestone' | 'exploration';

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  achievements,
  currentSol = 1,
  onNavigateToHabitat,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = achievements.filter((a) => {
    if (activeCategory === 'all') return true;
    return a.category === activeCategory;
  });

  const renderBadgeIcon = (iconName: string, unlocked: boolean) => {
    const iconClass = `w-8 h-8 ${unlocked ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'text-slate-600'}`;

    switch (iconName) {
      case 'Rocket':
        return <Rocket className={iconClass} />;
      case 'Brush':
        return <Brush className={iconClass} />;
      case 'Flame':
        return <Flame className={iconClass} />;
      case 'Droplets':
        return <Droplets className={iconClass} />;
      case 'Wind':
        return <Wind className={iconClass} />;
      case 'Zap':
        return <Zap className={iconClass} />;
      case 'Compass':
        return <Compass className={iconClass} />;
      case 'Globe2':
        return <Globe2 className={iconClass} />;
      case 'Award':
      default:
        return <Award className={iconClass} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'survival':
        return 'text-emerald-300 border-emerald-500/40 bg-emerald-950/50';
      case 'engineering':
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/50';
      case 'milestone':
        return 'text-amber-300 border-amber-500/40 bg-amber-950/50';
      case 'exploration':
        return 'text-purple-300 border-purple-500/40 bg-purple-950/50';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-800';
    }
  };

  return (
    <div className="space-y-7 animate-fadeIn pb-16">

      {/* 1. TOP HEADER BANNER WITH PROGRESS BAR */}
      <div className="p-6 sm:p-8 rounded-3xl aerospace-hud-amber relative overflow-hidden">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center space-x-3.5">
            <span className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400">
              <Trophy className="w-8 h-8" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-amber-500/40 text-amber-300 font-bold uppercase">
                  NASA ASTRONAUT MERIT EMBLEMS
                </span>
                <span className="text-xs font-mono text-slate-400">
                  SOL {currentSol} ACTIVE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                Astronaut Badge &amp; Honor Room
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/90 px-5 py-3 rounded-2xl border border-slate-800 self-start sm:self-center shadow-lg">
            <Award className="w-6 h-6 text-amber-400" />
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-tech">
                MERITS UNLOCKED
              </div>
              <div className="text-lg font-black text-amber-300 font-display">
                {unlockedCount} / {totalCount} Badges
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Mission Badges Earned across Sols:</span>
          </div>

          <div className="flex items-center space-x-3 flex-1 sm:max-w-md">
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-700 rounded-full glow-amber"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-xs font-mono text-amber-300 font-bold min-w-[3rem]">
              {completionPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY FILTER TABS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-300 mr-2 font-tech">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>FILTER MERITS:</span>
        </div>

        {[
          { key: 'all', label: 'All Merits' },
          { key: 'survival', label: 'Life Support' },
          { key: 'engineering', label: 'Engineering' },
          { key: 'milestone', label: 'Milestones' },
          { key: 'exploration', label: 'Exploration' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key as CategoryFilter)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-tech font-bold tracking-wider transition-all cursor-pointer ${activeCategory === tab.key
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-950/50 glow-amber'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. BADGES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAchievements.map((badge) => {
          const isUnlocked = badge.unlocked;

          return (
            <div
              key={badge.id}
              className={`rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden ${isUnlocked
                  ? 'border-2 border-amber-400/80 aerospace-hud-amber shadow-xl shadow-amber-950/40 glow-amber scale-[1.01]'
                  : 'border border-slate-800/80 bg-slate-950/60 opacity-80 hover:opacity-100 hover:border-slate-700'
                }`}
            >
              {isUnlocked && (
                <>
                  <div className="hud-corner-tl" />
                  <div className="hud-corner-tr" />
                  <div className="hud-corner-bl" />
                  <div className="hud-corner-br" />
                </>
              )}

              {/* Badge Top Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-transform hover:scale-105 shadow-md ${isUnlocked
                        ? 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-950/40 border-amber-400/80'
                        : 'bg-slate-900 border-slate-800'
                      }`}
                  >
                    {renderBadgeIcon(badge.icon, isUnlocked)}
                  </div>
                  <div>
                    <h2 className={`text-base font-display font-bold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                      {badge.name}
                    </h2>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${getCategoryColor(
                        badge.category
                      )}`}
                    >
                      {badge.category}
                    </span>
                  </div>
                </div>

                <div>
                  {isUnlocked ? (
                    <span className="flex items-center space-x-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{badge.unlockedAtSol ? `SOL ${badge.unlockedAtSol}` : 'AWARDED'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                      <Lock className="w-3.5 h-3.5" />
                      <span>LOCKED</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Badge Description */}
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {badge.description}
              </p>

              {/* Criteria Card */}
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold font-tech">
                  Unlock Objective:
                </div>
                <div className="text-xs text-slate-300 font-medium font-sans">
                  {badge.criteria}
                </div>
              </div>

              {/* Educational Fact Card */}
              <div
                className={`p-3.5 rounded-xl border space-y-1 ${isUnlocked
                    ? 'border-amber-500/30 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-950/40'
                  }`}
              >
                <div className="flex items-center space-x-1.5 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold font-tech">
                    NASA STEM Flight Heritage
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {badge.educationalFact}
                </p>
              </div>

            </div>
          );
        })}
      </div>

      {/* Bottom CTA to test skills */}
      {onNavigateToHabitat && (
        <div className="rounded-3xl aerospace-hud p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          <div className="space-y-1">
            <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
              Ready to earn your next mission merit?
            </h3>
            <p className="text-xs text-slate-300 font-sans">
              Enter the Habitat Control Deck to balance life support, engage ice smelting, and guide your habitat through all 30 Sols!
            </p>
          </div>

          <button
            onClick={onNavigateToHabitat}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-display font-bold text-xs shadow-lg shadow-blue-900/50 transition-all cursor-pointer whitespace-nowrap glow-cyan"
          >
            ENTER HABITAT COMMAND DECK
          </button>
        </div>
      )}

    </div>
  );
};
