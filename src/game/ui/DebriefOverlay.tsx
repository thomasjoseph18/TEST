import type { Achievement, Destination } from '../../types';
import type { MissionResult } from '../../engine/objectives';
import { rankFor } from '../../engine/objectives';
import { MISSIONS } from '../../data/missions';

interface Props {
  destination: Destination;
  result: MissionResult;
  xpTotal: number;
  achievements: Achievement[];
  nextUnlocked: boolean;
  onContinue(): void;
  onRetry(): void;
  onResume(): void;
}

export function DebriefOverlay({ destination, result, xpTotal, achievements, nextUnlocked, onContinue, onRetry, onResume }: Props) {
  const ok = result.outcome === 'success';
  const failed = result.outcome === 'failed';
  const rank = rankFor(xpTotal);
  const title = ok ? 'Mission complete!' : failed ? 'Mission paused' : 'Mission report';
  return (
    <div className="bs-layer">
      <div className="bs-modal-wrap" style={{ justifyContent: 'flex-end', paddingRight: '5vw', background: 'linear-gradient(90deg, transparent 20%, rgba(2,6,15,0.7))' }}>
        <div className="bs-panel bs-modal bs-modal--narrow" role="dialog" aria-label="Mission debrief" style={{ width: 'min(520px, 100%)' }}>
          <div className="bs-kicker">Mission debrief · {MISSIONS[destination].name}</div>
          <h2 className="bs-h" style={{ fontSize: '2em', color: ok ? 'var(--gold)' : failed ? 'var(--amber)' : 'var(--cyan)', margin: '4px 0 6px' }}>{title}</h2>
          <div className="bs-stars" aria-label={`${result.stars} of 3 stars`}>
            {[1, 2, 3].map((n) => <span key={n} className={result.stars >= n ? 'on' : ''}>★</span>)}
          </div>
          <p style={{ lineHeight: 1.55, margin: '6px 0 12px' }}>
            {ok ? 'Your crew survived all 30 Sols. Great work managing air, water, power and food!'
              : failed ? 'The crew could not continue this time. Every real mission team studies what went wrong, then tries again smarter.'
              : 'Here is how the mission is going so far. You can keep playing.'}
          </p>
          <ul className="bs-list">
            {result.lines.map((l) => (
              <li key={l.label} className={l.good ? 'done' : ''} style={{ justifyContent: 'space-between' }}>
                <span><span style={{ color: l.good ? 'var(--mint)' : 'var(--amber)' }}>{l.good ? '✓' : '•'}</span> {l.label}</span><b>{l.value}</b>
              </li>
            ))}
          </ul>
          <div className="bs-grid2" style={{ marginTop: 12 }}>
            <div className="bs-stat"><div className="bs-sub">Scientific data</div><big>+{result.xp} XP</big></div>
            <div className="bs-stat"><div className="bs-sub">Rank</div><big style={{ fontSize: '1.15em' }}>{rank.title}</big><div className="bs-sub">{xpTotal} XP total</div></div>
          </div>
          {achievements.length > 0 && (
            <div className="bs-stat" style={{ marginTop: 12, borderColor: 'var(--gold)' }}>
              <div className="bs-kicker" style={{ color: 'var(--gold)' }}>Achievements earned</div>
              {achievements.slice(0, 4).map((a) => <div key={a.id}>🏅 <b>{a.name}</b></div>)}
            </div>
          )}
          {ok && nextUnlocked && <p style={{ color: 'var(--mint)', marginTop: 12 }}>🔓 A new destination is open in the mission table.</p>}
          <div className="bs-row" style={{ marginTop: 16 }}>
            <button className="bs-btn bs-btn--go" onClick={onContinue} autoFocus>Continue</button>
            {!ok && !failed && <button className="bs-btn" onClick={onResume}>Keep playing</button>}
            {(failed || ok) && <button className="bs-btn bs-btn--ghost" onClick={onRetry}>Train this mission again</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
