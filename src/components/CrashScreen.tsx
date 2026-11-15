import React, { useState } from 'react';
import { SAVE_KEY, loadSave, resolveStorage, writeSave } from '../engine/save';

/** Last-resort screen shown by the root error boundary. Written to depend on as little as possible. */
export const CrashScreen: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const openClassic = () => {
    try {
      const { storage } = resolveStorage(() => window.localStorage);
      const save = loadSave(storage);
      writeSave(storage, { ...save, settings: { ...save.settings, uiMode: 'classic' } });
    } catch {
      /* storage unavailable: a plain reload is still fine */
    }
    window.location.reload();
  };

  const resetProgress = () => {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  const btn = 'px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer';
  return (
    <div role="alert" className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-3xl border border-amber-500/40 bg-[#070F2B] p-8 space-y-4">
        <p className="text-xs font-mono tracking-widest text-amber-400">MISSION CONTROL NOTICE</p>
        <h1 className="text-2xl font-black">Something went wrong on board</h1>
        <p className="text-sm text-slate-300">
          The mission computer hit a problem. Your saved progress is safe. You can try again, reload, or use Classic Mode.
        </p>
        <details className="text-xs text-slate-400 font-mono">
          <summary className="cursor-pointer">Technical details (for a grown-up)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
        </details>
        <div className="flex flex-wrap gap-3 pt-2">
          <button className={`${btn} bg-blue-600 border-blue-400 text-white`} onClick={onRetry}>Try again</button>
          <button className={`${btn} bg-slate-800 border-slate-600`} onClick={() => window.location.reload()}>Reload</button>
          <button className={`${btn} bg-slate-800 border-slate-600`} onClick={openClassic}>Open Classic Mode</button>
        </div>
        <div className="pt-4 border-t border-slate-800">
          {!confirmReset ? (
            <button className="text-xs text-slate-400 underline cursor-pointer" onClick={() => setConfirmReset(true)}>
              Still stuck? Reset saved progress…
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-300">This erases all saved missions, journal entries and achievements on this device.</p>
              <button className={`${btn} bg-red-700 border-red-400 text-white`} onClick={resetProgress}>Yes, erase and reload</button>{' '}
              <button className={`${btn} bg-slate-800 border-slate-600`} onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
