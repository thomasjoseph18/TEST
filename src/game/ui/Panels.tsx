import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Achievement, Destination, HabitatSimulationState, JournalEntry, O2Mode, PowerAllocation, SettingsConfig, WaterRation, WaterRecyclerMode } from '../../types';
import type { SimulationCalculations } from '../../engine/simulation';
import type { FieldState } from '../../engine/field';
import { CROP, canHarvest, isSolarStorm, nextStormSol, evaSecondsRemaining } from '../../engine/field';
import { SITE_TASKS, nextObjective, objectiveStatus, rankFor, taskForSite } from '../../engine/objectives';
import { MISSIONS, NOVA_FACTS } from '../../data/missions';
import { EXPLORATION_POINTS } from '../../data/exploration';
import { APOLLO13_SOURCES } from '../../data/apollo13';
import { isDestinationUnlocked, type DestinationId, type Unlocks } from '../../engine/gameState';
import { siteIdsFor } from '../../engine/progress';
import type { SaveGame } from '../../engine/save';
import { formatClock } from '../runtime';
import { NovaFace } from './Hud';

export type PanelKind =
  | 'pause' | 'navigation' | 'objectives' | 'status' | 'journal' | 'achievements' | 'replay' | 'nova'
  | 'oxygen' | 'water' | 'power' | 'food' | 'radiation' | 'console' | 'site' | 'sol' | 'artemis';

export interface PanelState {
  kind: PanelKind;
  siteId?: string;
  notes?: string[];
  /** After closing the Sol briefing, jump to the mission debrief. */
  endAfter?: boolean;
}

export interface PanelActions {
  close(): void;
  setO2Mode(m: O2Mode): void;
  setWaterRecyclerMode(m: WaterRecyclerMode): void;
  setWaterRation(r: WaterRation): void;
  toggleIce(): void;
  togglePower(k: keyof PowerAllocation): void;
  useEmergencyO2(): void;
  harvest(): void;
  answerQuiz(siteId: string, choice: number): void;
  selectDestination(d: DestinationId): void;
  launch(): void;
  replayIntro(): void;
  updateSettings(p: Partial<SettingsConfig>): void;
  addJournalNote(text: string): void;
  restartMission(): void;
  openClassic(): void;
  goCommand(): void;
  endMission(): void;
  fastForward(n: number): void;
  openPanel(k: PanelKind): void;
  askNova(): void;
  readArtemis(): void;
}

export interface PanelProps {
  panel: PanelState;
  screen: string;
  destination: Destination;
  sim: HabitatSimulationState;
  calc: SimulationCalculations;
  field: FieldState;
  save: SaveGame;
  settings: SettingsConfig;
  achievements: Achievement[];
  journal: JournalEntry[];
  completed: string[];
  unlocks: Unlocks;
  notice: 'mars_locked' | 'artemis_locked' | null;
  novaHint: string;
  act: PanelActions;
}

function Modal({ title, kicker, onClose, children, narrow }: { title: string; kicker?: string; onClose: () => void; children: ReactNode; narrow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="bs-modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`bs-panel bs-modal ${narrow ? 'bs-modal--narrow' : ''}`}>
        <div className="bs-modal-head">
          <div>
            {kicker && <div className="bs-kicker">{kicker}</div>}
            <h2 className="bs-h" style={{ fontSize: '1.5em' }}>{title}</h2>
          </div>
          <button className="bs-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="bs-ctrl">
      {options.map((o) => <button key={o.v} className={`bs-seg ${value === o.v ? 'on' : ''}`} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v)}%`;
const bar = (v: number, color = 'var(--cyan)') => (
  <div className="bs-bar" style={{ height: 10 }}><i style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: color }} /></div>
);

// ---------------------------------------------------------------------------------------------
// Navigation (mission selection)
// ---------------------------------------------------------------------------------------------
function Navigation(p: PanelProps) {
  const { act, unlocks, destination, save } = p;
  const dests: { id: DestinationId; name: string; tag: string }[] = [
    { id: 'moon', name: 'The Moon', tag: 'Learn. Explore.' },
    { id: 'mars', name: 'Mars', tag: 'Discover.' },
    { id: 'artemis', name: 'Artemis', tag: 'Build the future.' },
  ];
  const bothDone = save.game.missionsCompleted.moon && save.game.missionsCompleted.mars;
  const info = MISSIONS[destination];
  const sim = save.simulations[destination];
  const started = sim.currentSol > 1 || save.field[destination].flags.eva_started;
  return (
    <Modal title="Choose your destination" kicker="Mission selection" onClose={act.close}>
      <div className="bs-dest-grid">
        {dests.map((d) => {
          const open = isDestinationUnlocked(d.id, unlocks);
          const done = d.id !== 'artemis' && save.game.missionsCompleted[d.id];
          return (
            <button key={d.id} className={`bs-dest ${destination === d.id && open ? 'is-sel' : ''}`} aria-disabled={!open && d.id !== 'artemis'} disabled={false}
              onClick={() => (d.id === 'artemis' && bothDone ? act.readArtemis() : act.selectDestination(d.id))}>
              <div className={`bs-orb ${d.id}`} />
              <h3 className="bs-h" style={{ textAlign: 'center', fontSize: '1.1em' }}>{d.name}</h3>
              <div className="bs-sub" style={{ textAlign: 'center' }}>{d.tag}</div>
              {d.id === 'artemis' ? (
                <div className="bs-lock" style={{ textAlign: 'center' }}>{bothDone ? 'Briefing unlocked' : 'FUTURE MISSION · LOCKED'}</div>
              ) : !open ? (
                <div className="bs-lock" style={{ textAlign: 'center' }}>LOCKED · finish Moon training</div>
              ) : (
                <div className="bs-sub" style={{ textAlign: 'center', color: done ? 'var(--mint)' : 'var(--cyan)' }}>
                  {done ? '✓ Training complete' : `Sol ${save.simulations[d.id].currentSol} of 30`}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {p.notice && (
        <p role="status" className="bs-stat" style={{ marginTop: 14, borderColor: 'var(--amber)', color: 'var(--amber)' }}>
          {p.notice === 'mars_locked'
            ? 'Mars opens after you finish your 30-Sol Moon training. Keep going, astronaut!'
            : 'Artemis is a future mission. Complete Moon and Mars training to read the briefing.'}
        </p>
      )}
      <div className="bs-panel" style={{ marginTop: 16, padding: 16 }}>
        <div className="bs-kicker">Current mission</div>
        <h3 className="bs-h" style={{ fontSize: '1.2em', margin: '4px 0 6px' }}>{info.name}</h3>
        <p style={{ margin: '0 0 10px', lineHeight: 1.55 }}>{info.primaryObjective}</p>
        <div className="bs-grid2">
          <div className="bs-sub">📍 {info.location}<br />🌍 Gravity: {info.gravity}<br />🌡 {info.tempRange}</div>
          <div className="bs-sub">🕐 Day length: {info.dayLength}<br />🫁 {info.atmosphere}<br />📖 {info.historyNote}</div>
        </div>
        <div className="bs-row" style={{ marginTop: 14 }}>
          <button className="bs-btn bs-btn--go" onClick={act.launch}>{started ? 'Continue mission' : 'Launch mission'}</button>
          <button className="bs-btn bs-btn--ghost" onClick={act.close}>Back to the Command Centre</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Objectives and status
// ---------------------------------------------------------------------------------------------
function Objectives(p: PanelProps) {
  const ctx = { destination: p.destination, sim: p.sim, field: p.field, completedSites: p.completed };
  const list = objectiveStatus(ctx);
  const next = nextObjective(ctx);
  return (
    <Modal title={`${MISSIONS[p.destination].name}`} kicker="Mission objectives" onClose={p.act.close}>
      <ul className="bs-list">
        {list.map((o) => (
          <li key={o.def.id} className={`${o.done ? 'done' : ''} ${next?.id === o.def.id ? 'next' : ''}`}>
            <span className="bs-check">✓</span>
            <div><b>{o.def.title}</b><div className="bs-sub">{o.def.hint}</div></div>
          </li>
        ))}
      </ul>
      <p className="bs-sub" style={{ marginTop: 12 }}>Objectives can be done in any order. Your compass shows where things are.</p>
    </Modal>
  );
}

function Status(p: PanelProps) {
  const { field, save, settings, sim } = p;
  const rank = rankFor(save.game.xp);
  const storm = isSolarStorm(p.destination, sim.currentSol);
  return (
    <Modal title={settings.callSign} kicker="Astronaut status" onClose={p.act.close}>
      <div className="bs-grid2">
        <div className="bs-stat"><div className="bs-sub">Rank</div><big>{rank.title}</big><div className="bs-sub">{save.game.xp} XP · next rank at {rank.next}</div></div>
        <div className="bs-stat"><div className="bs-sub">Crew health</div><big>{pct(field.crewHealth)}</big>{bar(field.crewHealth, 'var(--mint)')}</div>
        <div className="bs-stat"><div className="bs-sub">Suit oxygen</div><big>{pct(field.suitO2)}</big>{bar(field.suitO2)}<div className="bs-sub">About {formatClock(evaSecondsRemaining(field))} of walking left</div></div>
        <div className="bs-stat"><div className="bs-sub">Suit power</div><big>{pct(field.suitPower)}</big>{bar(field.suitPower, 'var(--amber)')}</div>
        <div className="bs-stat"><div className="bs-sub">Radiation exposure</div><big>{pct(field.radiationDose)}</big>{bar(field.radiationDose, 'var(--alert)')}<div className="bs-sub">{storm ? 'Solar storm today!' : 'Fades while you rest inside.'}</div></div>
        <div className="bs-stat"><div className="bs-sub">Rover</div><big>{pct(field.rover.battery)}</big>{bar(field.rover.battery, 'var(--amber)')}<div className="bs-sub">Hull {pct(field.rover.integrity)}</div></div>
      </div>
      <div className="bs-row bs-sub" style={{ marginTop: 14, gap: 24 }}>
        <span>🧪 Samples: {field.samples.length}</span><span>🛰 Sites done: {p.completed.filter((s) => siteIdsFor(p.destination).includes(s)).length}/{siteIdsFor(p.destination).length}</span>
        <span>⏱ Time outside: {formatClock(field.evaSeconds)}</span><span>🚑 Suit emergencies: {field.recoveries}</span>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Journal and achievements
// ---------------------------------------------------------------------------------------------
function Journal(p: PanelProps) {
  const [note, setNote] = useState('');
  return (
    <Modal title="Mission journal" kicker={MISSIONS[p.destination].name} onClose={p.act.close}>
      <div className="bs-row" style={{ marginBottom: 14, flexWrap: 'nowrap' }}>
        <input className="bs-input" style={{ flex: 1 }} value={note} maxLength={240} placeholder="Write your own note…" aria-label="New journal note"
          onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' && note.trim()) { p.act.addJournalNote(note.trim()); setNote(''); } }} />
        <button className="bs-btn" disabled={!note.trim()} onClick={() => { p.act.addJournalNote(note.trim()); setNote(''); }}>Add</button>
      </div>
      {p.journal.length === 0 && <p className="bs-sub">Nothing yet. Your discoveries will be logged here.</p>}
      {p.journal.slice(0, 60).map((e) => (
        <div key={e.id} className={`bs-journal-entry ${e.outcomeStatus ?? ''}`}>
          <div className="bs-kicker">Sol {e.sol} · {e.author}</div>
          <b>{e.title}</b>
          <p style={{ margin: '6px 0', lineHeight: 1.5 }}>{e.body}</p>
          {(e.scientificLearningPoint || e.scienceTip) && <div className="bs-sub">💡 {e.scientificLearningPoint || e.scienceTip}</div>}
          {e.badge && <div className="bs-sub" style={{ color: 'var(--gold)' }}>🏅 {e.badge.name}</div>}
        </div>
      ))}
    </Modal>
  );
}

function Achievements(p: PanelProps) {
  const got = p.achievements.filter((a) => a.unlocked).length;
  return (
    <Modal title="Achievements" kicker={`${got} of ${p.achievements.length} unlocked`} onClose={p.act.close}>
      <div className="bs-ach">
        {p.achievements.map((a) => (
          <div key={a.id} className={a.unlocked ? 'got' : 'locked'}>
            <div style={{ fontSize: '1.6em' }}>{a.unlocked ? '🏅' : '🔒'}</div>
            <b>{a.name}</b>
            <div className="bs-sub" style={{ margin: '4px 0' }}>{a.unlocked ? a.description : a.criteria}</div>
            {a.unlocked && <div className="bs-sub" style={{ color: 'var(--cyan)' }}>💡 {a.educationalFact}</div>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Life-support system panels (wired to the real simulation)
// ---------------------------------------------------------------------------------------------
function Oxygen({ sim, calc, act, close }: PanelProps & { close: () => void }) {
  return (
    <Modal title="Oxygen generator" kicker="Life support" onClose={close}>
      <div className="bs-grid2">
        <div className="bs-stat"><div className="bs-sub">Habitat oxygen</div><big>{pct(sim.oxygenLevel)}</big>{bar(sim.oxygenLevel, '#4aa8ff')}<div className="bs-sub">{calc.o2Delta >= 0 ? '+' : ''}{calc.o2Delta}% each Sol</div></div>
        <div className="bs-stat"><div className="bs-sub">Emergency canisters</div><big>{sim.emergencyO2Canisters}</big><button className="bs-btn" disabled={sim.emergencyO2Canisters <= 0 || sim.missionStatus !== 'active'} onClick={act.useEmergencyO2}>Release one (+25%)</button></div>
      </div>
      <h3 className="bs-h" style={{ fontSize: '1em', marginTop: 16 }}>Generation mode</h3>
      <Seg<O2Mode> label="Oxygen mode" value={sim.o2Mode} onChange={act.setO2Mode} options={[{ v: 'eco', label: 'Eco (saves power)' }, { v: 'standard', label: 'Standard' }, { v: 'boost', label: 'Boost (+10 kW)' }]} />
      <p className="bs-sub" style={{ marginTop: 12, lineHeight: 1.6 }}>The crew breathes oxygen all day, so the generator must make more than the crew uses. Boost mode makes extra air but needs extra power. Refilling your suit also draws on this supply.</p>
    </Modal>
  );
}

function Water({ sim, calc, act, close }: PanelProps & { close: () => void }) {
  return (
    <Modal title="Water recycler" kicker="Life support" onClose={close}>
      <div className="bs-grid2">
        <div className="bs-stat"><div className="bs-sub">Water</div><big>{pct(sim.waterLevel)}</big>{bar(sim.waterLevel, '#3ad6d0')}<div className="bs-sub">{calc.waterDelta >= 0 ? '+' : ''}{calc.waterDelta}% each Sol</div></div>
        <div className="bs-stat"><div className="bs-sub">Ice reserves</div><big>{sim.iceReservesKg} kg</big><button className="bs-btn" onClick={act.toggleIce}>{sim.iceSmeltingActive ? 'Stop ice smelter' : 'Start ice smelter (15 kW)'}</button></div>
      </div>
      <h3 className="bs-h" style={{ fontSize: '1em', marginTop: 16 }}>Recycler level</h3>
      <Seg<WaterRecyclerMode> label="Recycler level" value={sim.waterRecyclerMode} onChange={act.setWaterRecyclerMode} options={[{ v: 'off', label: 'Off' }, { v: 'basic', label: 'Basic' }, { v: 'advanced', label: 'Advanced' }, { v: 'hyper', label: 'Hyper' }]} />
      <h3 className="bs-h" style={{ fontSize: '1em', marginTop: 16 }}>Crew ration</h3>
      <Seg<WaterRation> label="Water ration" value={sim.waterRation} onChange={act.setWaterRation} options={[{ v: 'strict', label: 'Strict' }, { v: 'standard', label: 'Standard' }, { v: 'generous', label: 'Generous' }]} />
      <p className="bs-sub" style={{ marginTop: 12, lineHeight: 1.6 }}>The space station recycles most of its water, even from the air. Better recycling saves water but uses more power. Melting ice from the surface adds water but costs 15 kW.</p>
    </Modal>
  );
}

const POWER_ROWS: { k: keyof PowerAllocation; label: string; kw: string; essential?: boolean }[] = [
  { k: 'lifeSupportO2', label: 'Life support (oxygen)', kw: '25 kW', essential: true },
  { k: 'waterRecycling', label: 'Water recycling', kw: '10–30 kW', essential: true },
  { k: 'thermalRegulation', label: 'Heating and cooling', kw: '20 kW', essential: true },
  { k: 'scienceLab', label: 'Science lab and hydroponics', kw: '15 kW' },
  { k: 'communications', label: 'Communications', kw: '10 kW' },
];

function Power({ sim, calc, act, close }: PanelProps & { close: () => void }) {
  return (
    <Modal title="Power and batteries" kicker="Life support" onClose={close}>
      <div className="bs-grid2">
        <div className="bs-stat"><div className="bs-sub">Battery</div><big>{pct(sim.batteryCharge)}</big>{bar(sim.batteryCharge, 'var(--amber)')}<div className="bs-sub">Solar {calc.powerGenerated} kW · demand {calc.totalDemand} kW · net {calc.netPowerKw >= 0 ? '+' : ''}{calc.netPowerKw} kW</div></div>
        <div className="bs-stat"><div className="bs-sub">Dust on solar panels</div><big>{pct(sim.solarDustAccumulation)}</big>{bar(sim.solarDustAccumulation, '#b0a090')}<div className="bs-sub">Go outside and wipe the array by hand to clear it.</div></div>
      </div>
      <h3 className="bs-h" style={{ fontSize: '1em', marginTop: 16 }}>Power switches</h3>
      <div className="bs-ctrl">
        {POWER_ROWS.map((r) => (
          <button key={r.k} className={`bs-seg ${sim.powerAllocation[r.k] ? 'on' : ''}`} aria-pressed={sim.powerAllocation[r.k]} onClick={() => act.togglePower(r.k)}>
            {r.label} · {r.kw}{r.essential ? ' ★' : ''}
          </button>
        ))}
      </div>
      <p className="bs-sub" style={{ marginTop: 12, lineHeight: 1.6 }}>★ marks machines that keep the crew alive. If demand is higher than the solar panels make, the batteries fill the gap until they run out. Turn off extras to save power.</p>
    </Modal>
  );
}

function Food({ sim, field, act, close }: PanelProps & { close: () => void }) {
  return (
    <Modal title="Hydroponics garden" kicker="Food production" onClose={close}>
      <div className="bs-grid2">
        <div className="bs-stat"><div className="bs-sub">Food pantry</div><big>{pct(field.foodLevel)}</big>{bar(field.foodLevel, 'var(--mint)')}<div className="bs-sub">The crew eats {CROP.eatPerSol}% each Sol.</div></div>
        <div className="bs-stat"><div className="bs-sub">Crops growing</div><big>{pct(field.cropGrowth)}</big>{bar(field.cropGrowth, '#8be04a')}
          <button className="bs-btn bs-btn--go" style={{ marginTop: 8 }} disabled={!canHarvest(field)} onClick={act.harvest}>{canHarvest(field) ? `Harvest (+${CROP.harvestFood}% food)` : 'Not ready yet'}</button></div>
      </div>
      <p className="bs-sub" style={{ marginTop: 12, lineHeight: 1.6 }}>
        Plants grow under LED lights without soil, in water full of nutrients. They need the <b>Science lab</b> power switch {sim.powerAllocation.scienceLab ? 'on (it is)' : 'on (it is OFF right now)'} plus water and a charged battery. Plants also help clean the air.
      </p>
      {!sim.powerAllocation.scienceLab && <button className="bs-btn" onClick={() => act.togglePower('scienceLab')}>Turn on the Science lab power</button>}
    </Modal>
  );
}

function Radiation({ sim, field, destination, close }: PanelProps & { close: () => void }) {
  const nxt = nextStormSol(destination, sim.currentSol);
  const storm = isSolarStorm(destination, sim.currentSol);
  return (
    <Modal title="Radiation shelter" kicker="Protection" onClose={close}>
      <div className="bs-grid2">
        <div className="bs-stat"><div className="bs-sub">Your exposure</div><big>{pct(field.radiationDose)}</big>{bar(field.radiationDose, 'var(--alert)')}</div>
        <div className="bs-stat"><div className="bs-sub">Solar storms</div><big>{storm ? 'TODAY' : nxt ? `Sol ${nxt}` : 'None left'}</big><div className="bs-sub">{storm ? 'Stay inside, or keep trips very short.' : 'Next solar particle event'}</div></div>
      </div>
      <p className="bs-sub" style={{ marginTop: 12, lineHeight: 1.6 }}>Outside, there is no thick atmosphere to block radiation from the Sun and space. During a solar storm the dose climbs about seven times faster. Inside the habitat your exposure slowly fades overnight. This shielded alcove is surrounded by water tanks, a real design idea for storm shelters.</p>
    </Modal>
  );
}

function ConsolePanel(p: PanelProps) {
  const { sim, act } = p;
  const ev = sim.currentEvent;
  const ctx = { destination: p.destination, sim, field: p.field, completedSites: p.completed };
  const next = nextObjective(ctx);
  return (
    <Modal title={`Sol ${sim.currentSol} briefing`} kicker="Mission console" onClose={act.close}>
      <div className="bs-panel" style={{ padding: 14 }}>
        <div className="bs-kicker">Today: {ev.title}</div>
        <p style={{ margin: '6px 0', lineHeight: 1.55 }}>{ev.description}</p>
        <p className="bs-sub" style={{ lineHeight: 1.55 }}><b style={{ color: 'var(--text)' }}>Scenario:</b> {ev.scenario}</p>
        <p className="bs-sub" style={{ lineHeight: 1.55 }}><b style={{ color: 'var(--text)' }}>Science:</b> {ev.scientificConcept}</p>
        <p className="bs-sub" style={{ lineHeight: 1.55 }}><b style={{ color: 'var(--mint)' }}>Suggested plan:</b> {ev.recommendedAction}</p>
      </div>
      <p style={{ marginTop: 12 }}><b>Next objective:</b> {next ? next.title : 'All done. Finish the Sols!'}</p>
      <div className="bs-row" style={{ marginTop: 12 }}>
        <button className="bs-btn" onClick={() => p.act.fastForward(5)} disabled={sim.missionStatus !== 'active'}>Autopilot: skip 5 Sols</button>
        <button className="bs-btn bs-btn--ghost" onClick={act.endMission}>End mission and open debrief</button>
      </div>
      <p className="bs-sub" style={{ marginTop: 8 }}>Autopilot keeps all your current settings, so only skip ahead when your habitat is in good shape. Sleeping in the crew bunk is the usual way to start the next Sol.</p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Site discovery + quiz
// ---------------------------------------------------------------------------------------------
function Site(p: PanelProps) {
  const id = p.panel.siteId ?? '';
  const pt = EXPLORATION_POINTS.find((x) => x.id === id);
  const task = taskForSite(id) ?? SITE_TASKS[0];
  const answered = p.save.game.quizAnswered.includes(id);
  const correct = p.save.game.quizCorrect.includes(id);
  const [choice, setChoice] = useState<number | null>(null);
  if (!pt) return null;
  const showResult = answered || choice !== null;
  return (
    <Modal title={pt.title} kicker={`Discovery · ${pt.coordinates}`} onClose={p.act.close}>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{pt.description}</p>
      <div className="bs-grid2" style={{ marginTop: 12 }}>
        <div className="bs-stat"><b>Why it matters</b><div className="bs-sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{pt.scientificSignificance}</div></div>
        <div className="bs-stat"><b>NASA connection</b><div className="bs-sub" style={{ marginTop: 4, lineHeight: 1.5 }}>{pt.nasaConnection}</div></div>
      </div>
      <p style={{ marginTop: 12, color: 'var(--cyan)' }}>💡 {pt.interactiveFact}</p>
      <div className="bs-panel" style={{ marginTop: 12, padding: 14 }}>
        <div className="bs-kicker">Cadet check{answered ? '' : ' · +15 XP'}</div>
        <b style={{ display: 'block', margin: '4px 0' }}>{task.quiz.question}</b>
        {task.quiz.options.map((o, i) => {
          const isRight = i === task.quiz.correct;
          const cls = showResult ? (isRight ? 'right' : choice === i ? 'wrong' : '') : '';
          return (
            <button key={o} className={`bs-btn bs-quiz-opt ${cls}`} disabled={showResult} onClick={() => { setChoice(i); p.act.answerQuiz(id, i); }}>{o}</button>
          );
        })}
        {showResult && <p className="bs-sub" style={{ marginTop: 10, lineHeight: 1.55 }}>{(answered ? correct : choice === task.quiz.correct) ? '✓ Correct! ' : 'Good try! '}{task.quiz.explanation}</p>}
      </div>
      <div className="bs-row" style={{ marginTop: 14 }}><button className="bs-btn bs-btn--go" onClick={p.act.close}>Continue exploring</button></div>
    </Modal>
  );
}

function SolBriefing(p: PanelProps) {
  const ev = p.sim.currentEvent;
  const over = p.sim.missionStatus !== 'active';
  return (
    <Modal title={over ? 'Mission complete' : `Sol ${p.sim.currentSol} begins`} kicker="Sol briefing" onClose={p.act.close} narrow>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{p.sim.lastDebriefMessage}</p>
      {(p.panel.notes ?? []).map((n) => <p key={n} className="bs-sub" style={{ margin: '8px 0 0', color: 'var(--amber)' }}>⚠ {n}</p>)}
      {!over && (
        <div className="bs-panel" style={{ marginTop: 12, padding: 12 }}>
          <div className="bs-kicker">Today: {ev.title}</div>
          <p className="bs-sub" style={{ margin: '4px 0', lineHeight: 1.5 }}>{ev.description}</p>
          <p className="bs-sub" style={{ margin: 0 }}>💡 {ev.tip}</p>
        </div>
      )}
      <div className="bs-row" style={{ marginTop: 14 }}><button className="bs-btn bs-btn--go" onClick={p.act.close}>{p.panel.endAfter ? 'Open the debrief' : 'Start the day'}</button></div>
    </Modal>
  );
}

function NovaPanel(p: PanelProps) {
  const [i, setI] = useState(() => Math.floor(Math.random() * NOVA_FACTS.length));
  return (
    <Modal title="NOVA" kicker="Your mission companion" onClose={p.act.close} narrow>
      <div className="bs-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div className="bs-nova-face" style={{ flex: 'none' }}><NovaFace size={56} /></div>
        <div>
          <p style={{ margin: 0, lineHeight: 1.55 }}><b>Next step:</b> {p.novaHint}</p>
          <p className="bs-sub" style={{ lineHeight: 1.55 }}>💡 {NOVA_FACTS[i]}</p>
        </div>
      </div>
      <div className="bs-row" style={{ marginTop: 12 }}>
        <button className="bs-btn" onClick={() => setI((i + 1) % NOVA_FACTS.length)}>Another fact</button>
        <button className="bs-btn bs-btn--ghost" onClick={p.act.close}>Thanks, NOVA</button>
      </div>
      <p className="bs-sub" style={{ marginTop: 10 }}>NOVA is a made-up robot helper for this game, not a real NASA system.</p>
    </Modal>
  );
}

function Replay(p: PanelProps) {
  return (
    <Modal title="Apollo 13 exhibit" kicker="Real NASA history" onClose={p.act.close} narrow>
      <p style={{ lineHeight: 1.6, marginTop: 0 }}>In April 1970 an oxygen tank failed on the way to the Moon. The crew and the team on the ground worked together to bring everyone home safely.</p>
      <p className="bs-sub" style={{ lineHeight: 1.6 }}>Sources used: {APOLLO13_SOURCES.join('; ')}.</p>
      <div className="bs-row"><button className="bs-btn bs-btn--go" onClick={p.act.replayIntro}>Replay the story</button><button className="bs-btn bs-btn--ghost" onClick={p.act.close}>Close</button></div>
    </Modal>
  );
}

function Artemis(p: PanelProps) {
  return (
    <Modal title="Artemis briefing" kicker="Future mission · not yet playable" onClose={p.act.close} narrow>
      <p style={{ lineHeight: 1.6, marginTop: 0 }}>You have finished Moon and Mars training. Artemis is NASA’s programme to return people to the Moon and prepare for Mars. Real Artemis missions are still being built, so this briefing is the last thing to unlock in this prototype.</p>
      <p className="bs-sub" style={{ lineHeight: 1.6 }}>Artemis is named after the Greek goddess of the Moon, twin sister of Apollo. Future crews will use what you practised here: managing air, water, power and food far from home.</p>
      <button className="bs-btn bs-btn--go" onClick={p.act.close}>Back to the table</button>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// Pause + settings
// ---------------------------------------------------------------------------------------------
function Pause(p: PanelProps) {
  const { settings: s, act } = p;
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const [confirm, setConfirm] = useState(false);
  const toggle = (k: 'audioEnabled' | 'novaVoiceEnabled' | 'captionsEnabled' | 'reducedMotion' | 'lowPerformanceMode') => (
    <button className={`bs-seg ${s[k] ? 'on' : ''}`} aria-pressed={s[k]} onClick={() => act.updateSettings({ [k]: !s[k] })}>{s[k] ? 'On' : 'Off'}</button>
  );
  return (
    <Modal title={view === 'menu' ? 'Paused' : 'Settings'} kicker="BUILDSCAPES" onClose={act.close} narrow>
      {view === 'menu' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="bs-btn bs-btn--go" onClick={act.close}>Resume</button>
          <button className="bs-btn" onClick={() => act.openPanel('objectives')}>Objectives</button>
          <button className="bs-btn" onClick={() => act.openPanel('journal')}>Journal</button>
          <button className="bs-btn" onClick={() => act.openPanel('achievements')}>Achievements</button>
          <button className="bs-btn" onClick={() => setView('settings')}>Settings</button>
          {p.screen !== 'command' && <button className="bs-btn" onClick={act.goCommand}>Return to the Command Centre</button>}
          <button className="bs-btn" onClick={act.replayIntro}>Replay Apollo 13 story</button>
          {!confirm ? <button className="bs-btn bs-btn--danger" onClick={() => setConfirm(true)}>Restart this mission</button>
            : <div className="bs-row"><span className="bs-sub">Restart {p.destination === 'mars' ? 'Mars' : 'Moon'} from Sol 1? Your other planet stays safe.</span><button className="bs-btn bs-btn--danger" onClick={act.restartMission}>Yes, restart</button><button className="bs-btn bs-btn--ghost" onClick={() => setConfirm(false)}>Cancel</button></div>}
          <button className="bs-btn bs-btn--ghost" onClick={act.openClassic}>Switch to Classic Mode</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <label className="bs-row">Call sign <input className="bs-input" value={s.callSign} maxLength={24} aria-label="Call sign" onKeyDown={(e) => e.stopPropagation()} onChange={(e) => act.updateSettings({ callSign: e.target.value })} /></label>
          <div className="bs-row">Sound {toggle('audioEnabled')} Volume <input type="range" className="bs-slider" min={0} max={1} step={0.05} value={s.masterVolume} aria-label="Volume" onChange={(e) => act.updateSettings({ masterVolume: Number(e.target.value) })} /></div>
          <div className="bs-row">Spoken voice {toggle('novaVoiceEnabled')}</div>
          <div className="bs-row">Captions {toggle('captionsEnabled')}</div>
          <div className="bs-row">Reduce motion {toggle('reducedMotion')}</div>
          <div className="bs-row">Performance mode (for slower laptops) {toggle('lowPerformanceMode')}</div>
          <div className="bs-row">Text size <Seg<'normal' | 'large'> label="Text size" value={s.textSize} onChange={(v) => act.updateSettings({ textSize: v })} options={[{ v: 'normal', label: 'Normal' }, { v: 'large', label: 'Large' }]} /></div>
          <button className="bs-btn" onClick={() => setView('menu')}>Back</button>
        </div>
      )}
    </Modal>
  );
}

export function Panels(p: PanelProps) {
  const close = p.act.close;
  switch (p.panel.kind) {
    case 'pause': return <Pause {...p} />;
    case 'navigation': return <Navigation {...p} />;
    case 'objectives': return <Objectives {...p} />;
    case 'status': return <Status {...p} />;
    case 'journal': return <Journal {...p} />;
    case 'achievements': return <Achievements {...p} />;
    case 'replay': return <Replay {...p} />;
    case 'nova': return <NovaPanel {...p} />;
    case 'oxygen': return <Oxygen {...p} close={close} />;
    case 'water': return <Water {...p} close={close} />;
    case 'power': return <Power {...p} close={close} />;
    case 'food': return <Food {...p} close={close} />;
    case 'radiation': return <Radiation {...p} close={close} />;
    case 'console': return <ConsolePanel {...p} />;
    case 'site': return <Site {...p} />;
    case 'sol': return <SolBriefing {...p} />;
    case 'artemis': return <Artemis {...p} />;
  }
}
