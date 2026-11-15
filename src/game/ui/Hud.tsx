import { useEffect, useState } from 'react';
import { hudStore, liveStore, useStore } from '../runtime';
import type { ToastTone } from '../api';

export function NovaFace({ size = 54, talking = false }: { size?: number; talking?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="NOVA, your robot companion">
      <circle cx="32" cy="34" r="22" fill="#e8eef8" />
      <circle cx="32" cy="34" r="22" fill="url(#nv)" />
      <rect x="13" y="24" width="38" height="20" rx="10" fill="#06142b" stroke="#2b8fff" strokeWidth="1.5" />
      <circle cx="24" cy="34" r="4" fill="#6fe8ff"><animate attributeName="r" values="4;4;1;4" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="40" cy="34" r="4" fill="#6fe8ff"><animate attributeName="r" values="4;4;1;4" dur="4s" repeatCount="indefinite" /></circle>
      {talking && <rect x="27" y="40" width="10" height="2" rx="1" fill="#6fe8ff"><animate attributeName="height" values="2;4;2" dur="0.4s" repeatCount="indefinite" /></rect>}
      <line x1="32" y1="12" x2="32" y2="6" stroke="#9fb4d0" strokeWidth="2" />
      <circle cx="32" cy="5" r="2.5" fill="#ffb84a" />
      <defs><radialGradient id="nv" cx="0.35" cy="0.3"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#9fb4d0" /></radialGradient></defs>
    </svg>
  );
}

const barClass = (v: number) => (v <= 15 ? 'bs-bar is-crit' : v <= 30 ? 'bs-bar is-low' : 'bs-bar');

function Gauge({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="bs-gauge" role="meter" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <span>{label}</span>
      <div className={barClass(v)}><i style={{ width: `${v}%` }} /></div>
      <b>{Math.round(v)}</b>
    </div>
  );
}

export function SuitGauges({ showRover }: { showRover: boolean }) {
  const live = useStore(liveStore);
  return (
    <div className="bs-panel bs-gauges">
      <Gauge label="O₂" value={live.suitO2} />
      <Gauge label="HP" value={live.suitHealth} />
      <Gauge label="Suit" value={live.suitPower} />
      {showRover && <Gauge label="Rvr" value={live.roverBattery} />}
    </div>
  );
}

export function Radar() {
  const hud = useStore(hudStore);
  return (
    <div className="bs-panel bs-radar" aria-hidden="true" style={{ borderRadius: '50%' }}>
      <div className="bs-radar-sweep" />
      <span className="bs-radar-n">N {Math.round(hud.heading)}°</span>
      <div className="bs-radar-you" />
      {hud.markers.map((m) => {
        const r = Math.min(1, m.distance / 320) * 54;
        const a = (m.rel * Math.PI) / 180;
        const x = 50 + Math.sin(a) * r * 0.9;
        const y = 50 - Math.cos(a) * r * 0.9;
        return <span key={m.id} className={`bs-blip k-${m.kind}`} style={{ left: `${x}%`, top: `${y}%` }} />;
      })}
    </div>
  );
}

export function Compass() {
  const hud = useStore(hudStore);
  const span = 120; // degrees visible
  const items = hud.markers.filter((m) => Math.abs(m.rel) < span / 2).sort((a, b) => Math.abs(a.rel) - Math.abs(b.rel)).slice(0, 3);
  const cardinals = [['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const;
  return (
    <div className="bs-panel bs-compass" aria-hidden="true">
      <div className="bs-compass-track">
        {cardinals.map(([c, deg]) => {
          let rel = deg - hud.heading; rel = ((rel + 540) % 360) - 180;
          if (Math.abs(rel) > span / 2) return null;
          return <span key={c} className="bs-compass-tick" style={{ left: `${50 + (rel / span) * 100}%`, top: 6 }}>{c}</span>;
        })}
        {items.map((m, i) => (
          <span key={m.id} className={`bs-compass-tick is-${m.kind}`} style={{ left: `${50 + (m.rel / span) * 100}%`, top: 4 }}>
            ◆{i === 0 && <small>{m.label} · {Math.round(m.distance)} m</small>}
          </span>
        ))}
        <div className="bs-compass-mid" />
      </div>
      <span className="bs-heading">{Math.round(hud.heading)}°</span>
    </div>
  );
}

export function Crosshair() {
  const hud = useStore(hudStore);
  return <div className={`bs-cross bs-ghost ${hud.prompt ? 'is-on' : ''}`} />;
}

export function Prompt() {
  const hud = useStore(hudStore);
  if (!hud.prompt) return null;
  const isHold = hud.prompt.startsWith('Hold E:');
  const text = isHold ? hud.prompt.replace('Hold E: ', '') : hud.prompt.replace(/^Press E to /, '');
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return (
    <div className="bs-panel bs-prompt bs-ghost" role="status">
      <div className="bs-prompt-row"><span className="bs-key">E</span><span>{isHold ? `Hold: ${sentence}` : sentence}</span></div>
      {hud.holdProgress > 0 && <div className="bs-hold"><i style={{ width: `${hud.holdProgress * 100}%` }} /></div>}
    </div>
  );
}

export function RoverDash({ battery }: { battery: number }) {
  const hud = useStore(hudStore);
  return (
    <div className="bs-panel bs-roverdash">
      <div><big>{Math.round(hud.speed * 3.6)}</big>km/h</div>
      <div><big>{Math.round(battery)}%</big>battery</div>
      <div style={{ alignSelf: 'center', color: 'var(--dim)', fontSize: '0.8em' }}>W drive · A D steer · Space brake</div>
    </div>
  );
}

export function ObjectiveTracker({ title, done, total, hint }: { title: string; done: number; total: number; hint?: string }) {
  return (
    <div className="bs-panel bs-objective">
      <div className="bs-row">
        <span className="bs-medal">★</span>
        <div>
          <div className="bs-objective-title">{title}</div>
          {hint && <div className="bs-sub" style={{ marginTop: 4 }}>{hint}</div>}
        </div>
      </div>
      <div className="bs-progress" aria-label={`${done} of ${total} objectives complete`}><i style={{ width: `${(done / Math.max(1, total)) * 100}%` }} /></div>
      <div className="bs-sub" style={{ marginTop: 5 }}>Objective {Math.min(done + 1, total)} of {total}</div>
    </div>
  );
}

export function NovaBubble({ text, talking }: { text: string | null; talking: boolean }) {
  if (!text) return null;
  return (
    <div className="bs-nova bs-ghost" role="status" aria-live="polite">
      <div className="bs-panel bs-nova-bubble"><b>NOVA</b>{text}</div>
      <div className="bs-nova-face"><NovaFace talking={talking} /></div>
    </div>
  );
}

export interface ToastItem { id: number; text: string; tone: ToastTone }

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="bs-toasts" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`bs-toast t-${t.tone}`}>{t.text}</div>)}
    </div>
  );
}

export function PlaceBanner({ title, subtitle }: { title: string; subtitle: string }) {
  const [key] = useState(() => Math.random());
  const [gone, setGone] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setGone(true), 5200); return () => window.clearTimeout(t); }, [key]);
  if (gone) return null;
  return <div className="bs-place bs-ghost"><h2>{title}</h2><p>{subtitle}</p></div>;
}

export function ControlsHint({ screen }: { screen: 'surface' | 'habitat' | 'command' }) {
  return (
    <div className="bs-hint bs-ghost" style={screen === 'surface' ? undefined : { bottom: 22 }}>
      <div><b>W A S D</b> move · <b>Shift</b> run · <b>Space</b> hop</div>
      <div><b>Mouse</b> look (click the view first) · <b>E</b> interact</div>
      <div><b>O</b> objectives · <b>J</b> journal · <b>N</b> ask NOVA · <b>Esc</b> menu</div>
      {screen === 'surface' && <div>Keep an eye on your <b>O₂</b> and <b>Suit</b> bars</div>}
    </div>
  );
}
