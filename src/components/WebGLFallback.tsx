import React from 'react';
import type { WebGLSupport } from '../engine/webgl';

/** Static starfield used in place of the 3D canvas (no WebGL, context lost, or a scene crash). */
export const StaticBackdrop: React.FC = () => (
  <div
    aria-hidden="true"
    className="absolute inset-0"
    style={{
      background:
        'radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 70% 20%, #cde 50%, transparent 51%), radial-gradient(1.5px 1.5px at 40% 75%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 85% 65%, #fff 50%, transparent 51%), radial-gradient(ellipse at 70% 110%, #0b2a5b 0%, #020617 60%)',
    }}
  />
);

interface WebGLFallbackProps {
  support: WebGLSupport;
  contextLost?: boolean;
  /** Only offered when WebGL exists but was judged too slow. */
  onTryAnyway?: () => void;
  onExit?: () => void;
}

/** Friendly explanation shown instead of a 3D scene. Used by full-screen POV tabs. */
export const WebGLFallback: React.FC<WebGLFallbackProps> = ({ support, contextLost, onTryAnyway, onExit }) => {
  const slow = support.reason === 'major_performance_caveat';
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
      <StaticBackdrop />
      <div role="alert" className="relative max-w-md w-full rounded-3xl border border-cyan-500/40 bg-[#070F2B]/95 p-7 space-y-3 text-slate-100">
        <p className="text-xs font-mono tracking-widest text-cyan-400">3D VIEW UNAVAILABLE</p>
        <h2 className="text-xl font-black">
          {contextLost ? 'The 3D view was interrupted' : 'This device can’t show the 3D view'}
        </h2>
        <p className="text-sm text-slate-300">
          {contextLost
            ? 'Your browser stopped the graphics. Reloading the page usually fixes it. Your progress is saved.'
            : slow
              ? 'Your graphics look too slow for first-person exploration. The habitat controls, journal and achievements still work.'
              : 'Your browser or device doesn’t support WebGL. The habitat controls, journal and achievements still work.'}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {contextLost && (
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer" onClick={() => window.location.reload()}>
              Reload
            </button>
          )}
          {onTryAnyway && !contextLost && (
            <button className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-sm font-bold cursor-pointer" onClick={onTryAnyway}>
              Try 3D anyway
            </button>
          )}
          {onExit && (
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer" onClick={onExit}>
              Back to mission screens
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
