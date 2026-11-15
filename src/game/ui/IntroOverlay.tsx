import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { APOLLO13_BEATS, APOLLO13_DISCLAIMER, APOLLO13_DURATION, APOLLO13_SOURCES, beatAt } from '../../data/apollo13';
import { BANG_TIME } from '../scenes/IntroScene';
import { audio } from '../audio';

interface Props {
  timeRef: MutableRefObject<number>;
  captions: boolean;
  reducedMotion: boolean;
  audioOn: boolean;
  /** First run vs replay changes the wording only. */
  replay: boolean;
  onFinish(): void;
  onToggleAudio(): void;
  onToggleCaptions(): void;
}

function TankDiagram() {
  return (
    <svg viewBox="0 0 300 190" role="img" aria-label="Diagram of the Apollo 13 service module showing oxygen tank number 2" style={{ width: '100%' }}>
      <rect x="10" y="20" width="280" height="150" rx="10" fill="#0b1d3a" stroke="#59d6ff" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return <line key={i} x1="150" y1="95" x2={150 + Math.cos(a) * 130} y2={95 + Math.sin(a) * 70} stroke="#1f4f8f" strokeWidth="1.5" />;
      })}
      <rect x="40" y="48" width="70" height="40" rx="8" fill="#1f4f8f" /><text x="75" y="72" fill="#cfe6ff" fontSize="11" textAnchor="middle">Fuel cells</text>
      <rect x="190" y="48" width="70" height="40" rx="8" fill="#1f4f8f" /><text x="225" y="72" fill="#cfe6ff" fontSize="11" textAnchor="middle">Hydrogen</text>
      <circle cx="75" cy="130" r="22" fill="#2b8fff" opacity="0.7" /><text x="75" y="134" fill="#fff" fontSize="10" textAnchor="middle">O₂ tank 1</text>
      <circle cx="225" cy="130" r="22" fill="#ff5a4a"><animate attributeName="opacity" values="1;0.5;1" dur="0.9s" repeatCount="indefinite" /></circle>
      <text x="225" y="134" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="700">O₂ tank 2</text>
      <path d="M225 108 L225 92" stroke="#ffb84a" strokeWidth="3" markerEnd="url(#a)" />
      <text x="150" y="14" fill="#59d6ff" fontSize="11" textAnchor="middle">Service module (simplified)</text>
      <text x="150" y="184" fill="#ffb84a" fontSize="10.5" textAnchor="middle">Damaged wires inside tank 2 made a spark</text>
    </svg>
  );
}

function FixDiagram() {
  return (
    <svg viewBox="0 0 300 170" role="img" aria-label="Diagram of the square carbon dioxide filter adapted to fit a round socket using tape, a bag and a hose" style={{ width: '100%' }}>
      <rect x="20" y="40" width="70" height="70" fill="#1f4f8f" stroke="#59d6ff" strokeWidth="2" /><text x="55" y="80" fill="#fff" fontSize="11" textAnchor="middle">Square filter</text>
      <text x="55" y="130" fill="#8fa6c4" fontSize="10" textAnchor="middle">from Odyssey</text>
      <path d="M95 75 H150" stroke="#ffb84a" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 5" />
      <rect x="150" y="62" width="40" height="26" rx="6" fill="#c9d0da" /><text x="170" y="79" fill="#06142b" fontSize="9" textAnchor="middle">hose</text>
      <rect x="148" y="60" width="44" height="6" fill="#ffd24a" opacity="0.8" /><rect x="148" y="84" width="44" height="6" fill="#ffd24a" opacity="0.8" />
      <circle cx="245" cy="75" r="32" fill="none" stroke="#7dffc0" strokeWidth="4" /><text x="245" y="79" fill="#fff" fontSize="11" textAnchor="middle">Round socket</text>
      <text x="245" y="125" fill="#8fa6c4" fontSize="10" textAnchor="middle">in Aquarius</text>
      <text x="150" y="156" fill="#ffb84a" fontSize="10.5" textAnchor="middle">Tape + plastic bag + cardboard + hose</text>
    </svg>
  );
}

export function IntroOverlay({ timeRef, captions, reducedMotion, audioOn, replay, onFinish, onToggleAudio, onToggleCaptions }: Props) {
  const [phase, setPhase] = useState<'title' | 'play' | 'ended'>('title');
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(0);
  const [prog, setProg] = useState(0);
  const pausedRef = useRef(false);
  const phaseRef = useRef(phase);
  const lastIdx = useRef(-1);
  const banged = useRef(false);
  phaseRef.current = phase;
  pausedRef.current = paused;

  const begin = useCallback(() => {
    audio.unlock();
    audio.ambience('space');
    timeRef.current = 0;
    banged.current = false;
    lastIdx.current = -1;
    setPaused(false);
    setPhase('play');
    audio.sfx('engine');
  }, [timeRef]);

  // clock
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (phaseRef.current === 'play' && !pausedRef.current) {
        timeRef.current = Math.min(APOLLO13_DURATION, timeRef.current + dt);
        const t = timeRef.current;
        const i = beatAt(t);
        setProg(t);
        if (i !== lastIdx.current) {
          lastIdx.current = i;
          setIdx(i);
          const b = APOLLO13_BEATS[i];
          if (b.radio) audio.sfx('radio');
          audio.speak(b.speech ?? b.caption, { pitch: b.tag === 'story' ? 1.25 : 0.95, rate: 0.95 });
        }
        if (!banged.current && t >= BANG_TIME) {
          banged.current = true;
          audio.sfx('boom'); window.setTimeout(() => audio.sfx('alarm'), 500);
          if (!reducedMotion) setFlash(1);
          window.setTimeout(() => setFlash(0), 700);
        }
        if (t >= APOLLO13_DURATION) setPhase('ended');
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); audio.stopSpeaking(); };
  }, [timeRef, reducedMotion]);

  const jump = useCallback((dir: 1 | -1) => {
    const i = Math.max(0, Math.min(APOLLO13_BEATS.length - 1, beatAt(timeRef.current) + dir));
    timeRef.current = APOLLO13_BEATS[i].start + 0.01;
    banged.current = timeRef.current >= BANG_TIME;
    lastIdx.current = -1;
    if (phaseRef.current === 'ended') setPhase('play');
  }, [timeRef]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT') return;
      if (e.key === 'Escape' || e.key === 'Enter') { if (phaseRef.current === 'title' && e.key === 'Enter') begin(); else onFinish(); }
      else if (e.code === 'Space') { e.preventDefault(); if (phaseRef.current === 'play') setPaused((p) => !p); else if (phaseRef.current === 'title') begin(); }
      else if (e.key === 'ArrowRight') jump(1);
      else if (e.key === 'ArrowLeft') jump(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [begin, jump, onFinish]);

  const beat = APOLLO13_BEATS[idx];
  const afterBang = prog >= BANG_TIME && ['incident', 'tank', 'lifeboat'].includes(beat.scene);
  const cold = beat.scene === 'cold' || beat.scene === 'fix';

  if (phase === 'title') {
    return (
      <div className="bs-layer">
        <div className="bs-title-card">
          <div className="bs-kicker">An educational space adventure</div>
          <h1>BUILDSCAPES<small>APOLLO TO ARTEMIS</small></h1>
          <p>{replay ? 'Watch the Apollo 13 story again.' : 'Your training begins with a true story: Apollo 13. Then your own mission starts.'}</p>
          <div className="bs-row" style={{ justifyContent: 'center' }}>
            <button className="bs-btn bs-btn--go" onClick={begin} autoFocus>{replay ? 'Play the story' : 'Begin'}</button>
            <button className="bs-btn bs-btn--ghost" onClick={onFinish}>Skip intro</button>
          </div>
          <div className="bs-disclaimer">{APOLLO13_DISCLAIMER}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bs-layer" aria-live="polite">
      <div className="bs-flash bs-ghost" style={{ opacity: flash, transition: flash ? 'none' : 'opacity 0.7s' }} />
      {afterBang && !reducedMotion && <div className="bs-vignette on bs-ghost" />}
      {cold && <div className="bs-ghost" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(80,140,255,0.28))' }} />}
      <div className="bs-cine-bars top" />
      <div className="bs-cine-bars bottom" />
      <div className="bs-cine-top bs-ghost">
        <span className={`bs-tag ${beat.tag}`}>{beat.tag === 'real' ? 'TRUE STORY · NASA HISTORY' : 'FICTION · YOUR STORY'}</span>
      </div>
      <div className="bs-cine-controls">
        <button className="bs-btn" onClick={() => jump(-1)} aria-label="Previous scene">◀</button>
        <button className="bs-btn" onClick={() => (phase === 'ended' ? (timeRef.current = 0, setPhase('play')) : setPaused((p) => !p))}>{phase === 'ended' ? 'Replay' : paused ? 'Play' : 'Pause'}</button>
        <button className="bs-btn" onClick={() => jump(1)} aria-label="Next scene">▶</button>
        <button className="bs-btn" onClick={onToggleCaptions} aria-pressed={captions}>CC {captions ? 'on' : 'off'}</button>
        <button className="bs-btn" onClick={onToggleAudio} aria-pressed={audioOn}>{audioOn ? 'Sound on' : 'Muted'}</button>
        <button className="bs-btn bs-btn--go" onClick={onFinish}>{phase === 'ended' ? 'Begin training' : 'Skip'}</button>
      </div>

      {beat.scene === 'tank' && <div className="bs-panel bs-diagram bs-ghost"><TankDiagram /></div>}
      {beat.scene === 'fix' && <div className="bs-panel bs-diagram bs-ghost"><FixDiagram /></div>}

      <div className="bs-timeline">
        {APOLLO13_BEATS.map((b) => (
          <i key={b.id} className={b.tag}><u style={{ transform: `scaleX(${prog >= b.start + b.duration ? 1 : prog <= b.start ? 0 : (prog - b.start) / b.duration})` }} /></i>
        )).slice(0, APOLLO13_BEATS.length)}
      </div>

      {captions && (
        <div className="bs-panel bs-caption bs-ghost" role="status">
          <div className="bs-caption-who"><span className={`bs-tag ${beat.tag}`}>{beat.tag === 'real' ? 'REAL' : 'STORY'}</span><span className="bs-kicker">{beat.speaker}</span>{beat.radio && <span className="bs-kicker" style={{ color: 'var(--amber)' }}>📡 RADIO</span>}</div>
          <div className={`bs-caption-text ${beat.quote ? 'quote' : ''}`}>{beat.caption}</div>
          {beat.quote && <div className="bs-sub" style={{ marginTop: 6 }}>Exact words from the Apollo 13 crew.</div>}
        </div>
      )}
      {phase === 'ended' && (
        <div className="bs-ghost" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(9vh + 4px)', textAlign: 'center', color: 'var(--dim)', fontSize: 11 }}>
          Sources: {APOLLO13_SOURCES.join(' · ')}
        </div>
      )}
    </div>
  );
}
