import React from 'react';
import type { GameAction, GameState, Screen, Unlocks } from '../engine/gameState';
import { isDestinationUnlocked } from '../engine/gameState';

const SCREEN_INFO: Record<Screen, { title: string; phase: string }> = {
  boot: { title: 'Starting up', phase: 'Phase 0' },
  intro: { title: 'Apollo 13 opening cinematic', phase: 'Phase 1' },
  command: { title: 'Mission Command Centre', phase: 'Phase 2' },
  navigation: { title: 'Star-map navigation console', phase: 'Phase 2' },
  habitat: { title: 'Habitat interior', phase: 'Phase 4' },
  surface: { title: 'Surface exploration (first person)', phase: 'Phase 3 (Moon) / Phase 5 (Mars)' },
  debrief: { title: 'Mission debrief room', phase: 'Phase 6' },
  classic: { title: 'Classic dashboard', phase: 'temporary' },
};

interface GameShellProps {
  state: GameState;
  dispatch: (a: GameAction) => void;
  unlocks: Unlocks;
  reducedMotion: boolean;
  onUseClassic: () => void;
  saveWarning?: boolean;
}

/**
 * Phase 0 PREVIEW shell: proves the state machine is wired and lets a developer walk every
 * transition. It is replaced screen by screen as real scenes arrive. It is not the final UI.
 */
export const GameShell: React.FC<GameShellProps> = ({ state, dispatch, unlocks, reducedMotion, onUseClassic, saveWarning }) => {
  const info = SCREEN_INFO[state.screen];
  const btn = 'px-4 py-2 rounded-xl text-sm font-bold border border-slate-600 bg-slate-800 hover:bg-slate-700 cursor-pointer';
  const can = (screen: Screen[]) => screen.includes(state.screen);

  return (
    <main className={`min-h-screen bg-[#020617] text-slate-100 p-6 flex items-center justify-center ${reducedMotion ? 'reduce-motion' : ''}`}>
      <div className="max-w-2xl w-full rounded-3xl border border-cyan-500/40 bg-[#070F2B] p-8 space-y-5">
        {saveWarning && (
          <p role="status" className="text-xs rounded-xl bg-amber-950/50 border border-amber-500/40 p-3 text-amber-200">
            Progress can’t be saved on this device right now.
          </p>
        )}
        <p className="text-xs font-mono tracking-widest text-cyan-400">GAME MODE · FOUNDATION PREVIEW</p>
        <h1 className="text-2xl font-black" data-testid="game-screen">{info.title}</h1>
        <p className="text-sm text-slate-300">
          Current screen: <code>{state.screen}</code> · destination: <code>{state.destination}</code> · real scene arrives in {info.phase}.
        </p>

        {state.notice && (
          <p role="status" className="text-sm rounded-xl bg-amber-950/50 border border-amber-500/40 p-3 text-amber-200">
            {state.notice === 'mars_locked'
              ? 'Mars unlocks after you finish your 30-Sol Moon training. Keep going, astronaut!'
              : 'Artemis is a future mission. It isn’t open yet.'}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {state.screen === 'intro' && <button className={btn} onClick={() => dispatch({ type: 'INTRO_FINISHED' })}>Skip / finish intro</button>}
          {can(['command', 'navigation']) && <button className={btn} onClick={() => dispatch({ type: 'REPLAY_INTRO' })}>Replay intro</button>}
          {state.screen === 'command' && <button className={btn} onClick={() => dispatch({ type: 'OPEN_NAVIGATION' })}>Open navigation console</button>}
          {state.screen === 'navigation' && (
            <>
              {(['moon', 'mars', 'artemis'] as const).map((d) => (
                <button key={d} className={btn} onClick={() => dispatch({ type: 'SELECT_DESTINATION', destination: d, unlocks })}>
                  {d === 'moon' ? 'Moon' : d === 'mars' ? 'Mars' : 'Artemis'}
                  {!isDestinationUnlocked(d, unlocks) && ' 🔒'}
                </button>
              ))}
            </>
          )}
          {can(['navigation', 'command', 'surface']) && <button className={btn} onClick={() => dispatch({ type: 'ENTER_HABITAT' })}>Enter habitat</button>}
          {can(['navigation', 'habitat']) && <button className={btn} onClick={() => dispatch({ type: 'ENTER_SURFACE' })}>Go to surface</button>}
          {can(['habitat', 'surface', 'command']) && <button className={btn} onClick={() => dispatch({ type: 'MISSION_ENDED' })}>End mission (debrief)</button>}
          {state.screen === 'debrief' && <button className={btn} onClick={() => dispatch({ type: 'DEBRIEF_DONE' })}>Finish debrief</button>}
          {can(['navigation', 'habitat', 'surface', 'debrief']) && <button className={btn} onClick={() => dispatch({ type: 'GO_COMMAND' })}>Back to command centre</button>}
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-slate-400">Game Mode is still being built. Classic Mode has every feature working today.</p>
          <button className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white cursor-pointer" onClick={onUseClassic}>
            Switch to Classic Mode
          </button>
        </div>
      </div>
    </main>
  );
};
