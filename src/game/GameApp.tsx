import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Achievement, Destination, JournalEntry, SettingsConfig } from '../types';
import type { GameAction, GameState } from '../engine/gameState';
import { isDestinationUnlocked } from '../engine/gameState';
import type { SaveGame } from '../engine/save';
import type { useHabitatSimulation } from '../hooks/useHabitatSimulation';
import type { WebGLSupport } from '../engine/webgl';
import { completeSiteTask, resetDestinationProgress } from '../engine/progress';
import {
  addSample, advanceFieldSol, applyRecovery, canAfford, chargeRover, harvestCrops, inspectSystem, isSolarStorm, needsRecovery, refillSuit,
  roverChargeCost, roverImpact, setFlag, suitRefillCost, suitWarning, evaSecondsRemaining, tickRover, tickSuit, HABITAT_SYSTEMS,
  type FieldState, type SuitWarning,
} from '../engine/field';
import { computeMissionResult, nextObjective, objectiveProgress, taskForSite, XP } from '../engine/objectives';
import { EXPLORATION_POINTS } from '../data/exploration';
import { MISSIONS } from '../data/missions';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { StaticBackdrop } from '../components/WebGLFallback';
import { audio } from './audio';
import { hudStore, input, liveStore, useStore } from './runtime';
import type { SceneApi, TickInfo, ToastTone } from './api';
import { IntroScene } from './scenes/IntroScene';
import { CommandScene } from './scenes/CommandScene';
import { HabitatScene } from './scenes/HabitatScene';
import { SurfaceScene } from './scenes/SurfaceScene';
import { DebriefScene } from './scenes/DebriefScene';
import { IntroOverlay } from './ui/IntroOverlay';
import { DebriefOverlay } from './ui/DebriefOverlay';
import { Panels, type PanelActions, type PanelKind, type PanelState } from './ui/Panels';
import {
  Compass, ControlsHint, Crosshair, NovaBubble, ObjectiveTracker, PlaceBanner, Prompt, Radar, RoverDash, SuitGauges, Toasts, type ToastItem,
} from './ui/Hud';
import './game.css';

type Sim = ReturnType<typeof useHabitatSimulation>;

export interface GameAppProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  save: SaveGame;
  saveRef: MutableRefObject<SaveGame>;
  commit: (fn: (s: SaveGame) => SaveGame) => void;
  commitSilent: (fn: (s: SaveGame) => SaveGame) => void;
  simulation: Sim;
  achievements: Achievement[];
  webgl: WebGLSupport;
  canRender3D: boolean;
  contextLost: boolean;
  onContextLost: () => void;
  onTryAnyway?: () => void;
  saveWarning: boolean;
  onUpdateSettings: (p: Partial<SettingsConfig>) => void;
  onUseClassic: () => void;
  initialJournal: (d: Destination) => JournalEntry[];
}

const PLAYABLE = ['command', 'navigation', 'habitat', 'surface'];

function placeFor(screen: string, dest: Destination, sol: number): { title: string; subtitle: string } {
  if (screen === 'surface') return dest === 'moon'
    ? { title: 'Shackleton Rim', subtitle: `LUNAR SOUTH POLE · SOL ${sol}` }
    : { title: 'Jezero Crater', subtitle: `MARS · SOL ${sol}` };
  if (screen === 'habitat') return { title: dest === 'moon' ? 'Lunar Habitat Alpha' : 'Mars Habitat Alpha', subtitle: `LIFE SUPPORT · SOL ${sol}` };
  return { title: 'Mission Command Centre', subtitle: 'EARTH · MISSION CONTROL' };
}

export function GameApp(props: GameAppProps) {
  const { state, dispatch, save, saveRef, commit, commitSilent, simulation, achievements, canRender3D, webgl, contextLost } = props;
  const dest = state.destination;
  const settings = save.settings;
  const screen = state.screen;
  const sim = simulation.state;

  // ---------------- local UI state ----------------
  const [panel, setPanelState] = useState<PanelState | null>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [novaText, setNovaText] = useState<string | null>(null);
  const [introReplay, setIntroReplay] = useState(false);
  const [, forceTick] = useState(0);
  const introTime = useRef(0);
  const panelRef = useRef<PanelState | null>(null);
  const expectedUnlock = useRef(false);
  const nonce = useRef(0);
  const toastId = useRef(0);
  const novaTimer = useRef<number | null>(null);
  const lastWarn = useRef<SuitWarning>('ok');
  const lastSay = useRef({ text: '', at: 0 });
  const simRef = useRef(simulation);
  simRef.current = simulation;
  const stateRef = useRef(state);
  stateRef.current = state;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const achSnapshot = useRef<string[] | null>(null);
  if (achSnapshot.current === null) achSnapshot.current = achievements.filter((a) => a.unlocked).map((a) => a.id);

  const setPanel = useCallback((p: PanelState | null) => {
    panelRef.current = p;
    if (p) {
      expectedUnlock.current = true;
      try { document.exitPointerLock?.(); } catch { /* */ }
    }
    input.blocked = p !== null;
    if (p) input.clear();
    setPanelState(p);
  }, []);

  // sound settings follow the save
  useEffect(() => {
    audio.configure({ enabled: settings.audioEnabled, volume: settings.masterVolume, voice: settings.novaVoiceEnabled });
  }, [settings.audioEnabled, settings.masterVolume, settings.novaVoiceEnabled]);

  useEffect(() => { input.attach(); return () => { input.blocked = false; audio.stopAll(); }; }, []);

  // flush silent commits so panels (React) see fresh suit / food numbers
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // ---------------- helpers ----------------
  const getField = useCallback((): FieldState => saveRef.current.field[stateRef.current.destination], [saveRef]);
  const patchField = useCallback((fn: (f: FieldState) => FieldState) => {
    const d = stateRef.current.destination;
    commitSilent((s) => {
      const next = fn(s.field[d]);
      return next === s.field[d] ? s : { ...s, field: { ...s.field, [d]: next } };
    });
  }, [commitSilent]);

  const toast = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const say = useCallback((text: string) => {
    const now = Date.now();
    if (lastSay.current.text === text && now - lastSay.current.at < 6000) return;
    lastSay.current = { text, at: now };
    setNovaText(text);
    if (novaTimer.current) window.clearTimeout(novaTimer.current);
    novaTimer.current = window.setTimeout(() => setNovaText(null), Math.min(14000, 5500 + text.length * 45));
    audio.sfx('blip');
    audio.speak(text, { pitch: 1.3, rate: 1.05 });
  }, []);

  const addJournal = useCallback((entry: Omit<JournalEntry, 'timestamp' | 'author' | 'scienceTip'> & { author?: string; scienceTip?: string }) => {
    const d = stateRef.current.destination;
    commit((s) => {
      if (s.journals[d].some((e) => e.id === entry.id)) return s;
      const full: JournalEntry = { scienceTip: '', ...entry, author: entry.author ?? s.settings.callSign, timestamp: new Date().toISOString() };
      return { ...s, journals: { ...s.journals, [d]: [full, ...s.journals[d]] } };
    });
  }, [commit]);

  const addXp = useCallback((n: number) => {
    commit((s) => ({ ...s, game: { ...s.game, xp: s.game.xp + n } }));
  }, [commit]);

  const ctxFor = useCallback(() => ({
    destination: stateRef.current.destination,
    sim: simRef.current.getState(),
    field: getField(),
    completedSites: saveRef.current.completedSites,
  }), [getField, saveRef]);

  const novaHint = useCallback((): string => {
    const f = getField();
    const s = simRef.current.getState();
    const d = stateRef.current.destination;
    if (s.oxygenLevel < 30) return 'Habitat oxygen is low! Open the oxygen generator and switch to Boost mode.';
    if (s.batteryCharge < 25) return 'The battery is low. Wipe the solar panels and switch off non-essential power.';
    if (f.foodLevel < 25) return 'Food is running low. Check the hydroponics garden and harvest the crops.';
    if (f.suitO2 < 35) return 'Your suit is low on oxygen. Head back to the airlock and refill at the suit rack.';
    if (isSolarStorm(d, s.currentSol)) return 'Solar storm today. Keep trips short or stay inside the shielded habitat.';
    const next = nextObjective(ctxFor());
    return next ? `${next.title}. ${next.hint}` : 'All objectives are done! Rest in the bunk until Sol 30 to finish the mission.';
  }, [ctxFor, getField]);

  const go = useCallback((a: GameAction, delay = 450) => {
    setLeaving(true);
    window.setTimeout(() => dispatch(a), delay);
  }, [dispatch]);

  // ---------------- screen changes ----------------
  const prevScreen = useRef<string>('');
  useEffect(() => {
    const cmd = (x: string) => x === 'command' || x === 'navigation';
    const sameScene = cmd(prevScreen.current) && cmd(screen);
    prevScreen.current = screen;
    setLeaving(false);
    if (!sameScene) setReady(false); // command <-> navigation share one scene, so it is already on screen
    setPanel(screen === 'navigation' ? { kind: 'navigation' } : null);
    liveStore.set({ onSurface: screen === 'surface', inRover: false });
    hudStore.set({ prompt: null, focusId: null, holdProgress: 0, markers: [], driving: false });
    const t = window.setTimeout(() => setReady(true), 6000); // failsafe: never trap the player behind the cover
    return () => window.clearTimeout(t);
  }, [screen, dest, setPanel]);

  useEffect(() => {
    if (!ready || !PLAYABLE.includes(screen) || screen === 'navigation') return;
    const t = window.setTimeout(() => {
      if (screen === 'command') {
        const started = saveRef.current.simulations.moon.currentSol > 1 || saveRef.current.field.moon.flags.eva_started;
        say(started
          ? `Welcome back, ${settingsRef.current.callSign}. Walk to the glowing table and press E to continue your mission.`
          : `Welcome to the Command Centre, ${settingsRef.current.callSign}! Walk up to the glowing table in the middle and press E to pick your mission.`);
      } else say(novaHint());
    }, 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, screen, dest]);

  // arrival at debrief: record completion once, with the star bonus
  const result = useMemo(() => (screen === 'debrief'
    ? computeMissionResult({ ...ctxFor(), quizCorrect: saveRef.current.game.quizCorrect })
    : null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [screen, dest]);
  useEffect(() => {
    if (screen !== 'debrief' || !result) return;
    if (result.outcome === 'success' && !saveRef.current.game.missionsCompleted[dest]) {
      commit((s) => ({ ...s, game: { ...s.game, xp: s.game.xp + result.stars * XP.star, missionsCompleted: { ...s.game.missionsCompleted, [dest]: true } } }));
      audio.sfx('success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, result]);

  // ---------------- pointer lock / Esc handling ----------------
  useEffect(() => {
    let prev = hudStore.get().locked;
    return hudStore.subscribe(() => {
      const l = hudStore.get().locked;
      if (prev && !l) {
        if (expectedUnlock.current) expectedUnlock.current = false;
        else if (!panelRef.current && PLAYABLE.includes(stateRef.current.screen) && stateRef.current.screen !== 'navigation') setPanel({ kind: 'pause' });
      }
      prev = l;
    });
  }, [setPanel]);

  // ---------------- panel actions ----------------
  const closePanel = useCallback(() => {
    if (stateRef.current.screen === 'navigation') { setPanel(null); dispatch({ type: 'GO_COMMAND' }); return; }
    const p = panelRef.current;
    setPanel(null);
    if (p?.kind === 'sol' && p.endAfter) dispatch({ type: 'MISSION_ENDED' });
    if (p?.kind === 'site') {
      // NOVA reacts to the discovery and points to the next thing to do.
      window.setTimeout(() => say(`Great discovery! ${novaHint()}`), 600);
    }
  }, [dispatch, setPanel, say, novaHint]);

  const openPanel = useCallback((k: PanelKind) => {
    if (k === 'navigation') { dispatch({ type: 'OPEN_NAVIGATION' }); return; }
    setPanel({ kind: k });
    audio.sfx('blip');
  }, [dispatch, setPanel]);

  const afterSol = useCallback((notes: string[], next: ReturnType<Sim['getState']>, field: FieldState) => {
    const over = next.missionStatus !== 'active' || field.crewHealth <= 0;
    setPanel({ kind: 'sol', notes, endAfter: over });
    audio.sfx(over ? 'unlock' : 'confirm');
  }, [setPanel]);

  const doSleep = useCallback((count = 1) => {
    const d = stateRef.current.destination;
    let notes: string[] = [];
    let next = simRef.current.getState();
    let f = getField();
    let advanced = 0;
    for (let i = 0; i < count; i++) {
      if (next.missionStatus !== 'active' || next.currentSol >= next.totalSols || f.crewHealth <= 0) break;
      const n = simRef.current.advanceSol();
      if (!n) break;
      next = n;
      const rolled = advanceFieldSol(f, next, d);
      f = rolled.field;
      notes = rolled.notes;
      advanced++;
    }
    if (advanced === 0) { toast('The mission is already finished.', 'warn'); return; }
    // overnight recharge of suit and rover costs real habitat resources
    const suitCost = suitRefillCost(f);
    if (canAfford(next, suitCost)) { simRef.current.drawResources(suitCost); f = refillSuit(f); }
    else notes = [...notes, 'There was not enough oxygen and power to recharge your suit overnight.'];
    f = { ...f, rover: { ...f.rover, battery: Math.min(100, f.rover.battery + 15) } };
    const finalField = f;
    commit((s) => ({ ...s, field: { ...s.field, [d]: finalField }, game: { ...s.game, xp: s.game.xp + advanced * XP.solSurvived } }));
    const st = simRef.current.getState();
    afterSol(notes, st, finalField);
  }, [afterSol, commit, getField, toast]);

  const api = useMemo<SceneApi>(() => ({
    get destination() { return stateRef.current.destination; },
    get lowPerf() { return settingsRef.current.lowPerformanceMode; },
    get reducedMotion() { return settingsRef.current.reducedMotion; },
    get recoveryNonce() { return nonce.current; },
    getSim: () => simRef.current.getState(),
    getField,
    getCompletedSites: () => saveRef.current.completedSites,
    patchField,
    setFlag: (flag) => patchField((f) => setFlag(f, flag)),
    tick(info: TickInfo) {
      const d = stateRef.current.destination;
      const s = simRef.current.getState();
      const storm = isSolarStorm(d, s.currentSol);
      let f = getField();
      f = tickSuit(f, { dt: info.dt, moving: info.moving, sprinting: info.sprinting, inRover: info.inRover, inColdShadow: info.inColdShadow, storm, sheltered: false });
      if (info.inRover) f = tickRover(f, info.dt, info.roverSpeed);
      if (needsRecovery(f)) {
        f = applyRecovery(f);
        nonce.current += 1;
        patchField(() => f);
        toast('Suit emergency! The crew brought you back to the airlock.', 'bad');
        say('That was close! The crew recovered you. Remember to watch your O₂ and Suit bars, and refill at the habitat.');
        audio.sfx('alarm');
        addJournal({ id: `eva-recovery-${s.currentSol}-${f.recoveries}`, sol: s.currentSol, title: 'Suit emergency', body: 'My suit ran out of oxygen or power, and the crew recovered me. Next time I will turn back sooner.', outcomeStatus: 'warning' });
        forceTick((n) => n + 1);
        return;
      }
      patchField(() => f);
      const warn = suitWarning(f, storm);
      liveStore.set({
        suitO2: f.suitO2, suitPower: f.suitPower, suitHealth: f.suitHealth, radiation: f.radiationDose,
        roverBattery: f.rover.battery, roverIntegrity: f.rover.integrity, warning: warn, storm,
        evaRemaining: evaSecondsRemaining(f), inRover: info.inRover, onSurface: true,
      });
      if (warn !== lastWarn.current) {
        lastWarn.current = warn;
        if (warn === 'low_o2') { say('Suit oxygen is getting low. Time to head back to the airlock!'); audio.sfx('alarm'); }
        else if (warn === 'low_power') { say('Suit power is low. Your heaters will fail soon, so head back.'); audio.sfx('alarm'); }
        else if (warn === 'critical') { toast('CRITICAL: return to the habitat now!', 'bad'); audio.sfx('alarm'); }
        else if (warn === 'radiation') say(storm ? 'Solar storm! Radiation is rising fast. Get inside!' : 'Radiation exposure is high. Rest inside to let it fade.');
      }
    },
    roverImpact: (speed) => { patchField((f) => roverImpact(f, speed)); toast('Rover bumped a rock!', 'warn'); },
    startTask(siteId) {
      const d = stateRef.current.destination;
      const task = taskForSite(siteId);
      const pt = EXPLORATION_POINTS.find((p) => p.id === siteId);
      if (!task || !pt || saveRef.current.completedSites.includes(siteId)) return;
      patchField((f) => ({ ...f, suitPower: Math.max(0, f.suitPower - task.powerCost) }));
      commit((s) => {
        const n = completeSiteTask(s, d, siteId);
        return { ...n, game: { ...n.game, xp: n.game.xp + XP.site } };
      });
      const sol = simRef.current.getState().currentSol;
      addJournal({
        id: `site-${siteId}`, sol, title: `Field note: ${pt.title}`, body: pt.description, outcomeStatus: 'nominal',
        scientificLearningPoint: pt.interactiveFact, badge: { name: `${pt.title} surveyed`, icon: 'Telescope', description: `Completed the science task at ${pt.title}.` },
      });
      audio.sfx('success');
      setPanel({ kind: 'site', siteId });
    },
    openSite: (siteId) => { setPanel({ kind: 'site', siteId }); audio.sfx('blip'); },
    collectSample() {
      const d = stateRef.current.destination;
      const w = d === 'moon' ? 'moon-regolith' : 'mars-rock';
      patchField((f) => addSample(f, w));
      addXp(XP.sample);
      const sol = simRef.current.getState().currentSol;
      addJournal({
        id: `sample-${w}`, sol, title: d === 'moon' ? 'Regolith sample collected' : 'Mars rock sample collected',
        body: d === 'moon' ? 'I drilled a core of lunar soil. Regolith is sharp, dusty broken rock, because the Moon has no wind or water to smooth it.' : 'I drilled a Martian rock core. Sealed samples like this may one day be studied in labs on Earth.',
        outcomeStatus: 'nominal',
      });
      audio.sfx('pickup');
      toast('Sample collected! +10 XP', 'good');
    },
    cleanSolar() {
      const s = simRef.current.getState();
      if (s.solarDustAccumulation < 1) { toast('The panels are already clean.', 'info'); return; }
      simRef.current.cleanSolarPanels();
      patchField((f) => setFlag(f, 'solar_cleaned'));
      audio.sfx('confirm');
      toast('Solar panels cleaned. More power!', 'good');
    },
    chargeRover() {
      const f = getField();
      const cost = roverChargeCost(f);
      if (!canAfford(simRef.current.getState(), cost)) { toast('The habitat cannot spare that much battery right now.', 'warn'); audio.sfx('error'); return; }
      simRef.current.drawResources(cost);
      patchField(chargeRover);
      audio.sfx('confirm');
      toast(`Rover charged (−${cost.battery}% habitat battery).`, 'good');
    },
    inspectSystem(id) {
      patchField((f) => inspectSystem(f, id));
      const f = getField();
      if (HABITAT_SYSTEMS.every((x) => x === id || f.inspected.includes(x))) toast('You have inspected every life-support system!', 'good');
    },
    openPanel,
    refillSuit() {
      const f = getField();
      const cost = suitRefillCost(f);
      if (cost.oxygen < 0.1 && cost.battery < 0.1) { toast('Your suit is already full.', 'info'); return; }
      if (!canAfford(simRef.current.getState(), cost)) { toast('Not enough habitat oxygen or power to refill your suit!', 'bad'); audio.sfx('error'); return; }
      simRef.current.drawResources(cost);
      patchField(refillSuit);
      audio.sfx('hiss');
      toast(`Suit refilled (−${cost.oxygen}% oxygen, −${cost.battery}% battery from the habitat).`, 'good');
    },
    harvest() {
      patchField(harvestCrops);
      audio.sfx('pickup');
      toast('Harvest complete! The pantry is fuller.', 'good');
    },
    sleep: () => doSleep(1),
    enterHabitat: () => { audio.sfx('door'); go({ type: 'ENTER_HABITAT' }); },
    enterSurface: () => {
      const f = getField();
      if (f.suitO2 < 40 || f.suitPower < 30) toast('Your suit is low. Refill it at the suit rack first!', 'warn');
      audio.sfx('hiss');
      go({ type: 'ENTER_SURFACE' });
    },
    goCommand: () => go({ type: 'GO_COMMAND' }),
    endMission: () => { setPanel(null); go({ type: 'MISSION_ENDED' }); },
    say,
    toast,
    sceneReady: () => setReady(true),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [getField, patchField, say, toast, doSleep, openPanel, go]);

  const act = useMemo<PanelActions>(() => ({
    close: closePanel,
    setO2Mode: (m) => simRef.current.setO2Mode(m),
    setWaterRecyclerMode: (m) => simRef.current.setWaterRecyclerMode(m),
    setWaterRation: (r) => simRef.current.setWaterRation(r),
    toggleIce: () => simRef.current.toggleIceSmelting(),
    togglePower: (k) => simRef.current.togglePowerAllocation(k),
    useEmergencyO2: () => simRef.current.useEmergencyO2Canister(),
    harvest: () => api.harvest(),
    answerQuiz(siteId, choice) {
      const task = taskForSite(siteId);
      if (!task || saveRef.current.game.quizAnswered.includes(siteId)) return;
      const right = choice === task.quiz.correct;
      commit((s) => ({
        ...s,
        game: {
          ...s.game,
          xp: s.game.xp + (right ? XP.quiz : 0),
          quizAnswered: [...s.game.quizAnswered, siteId],
          quizCorrect: right ? [...s.game.quizCorrect, siteId] : s.game.quizCorrect,
        },
      }));
      audio.sfx(right ? 'success' : 'blip');
    },
    selectDestination: (id) => {
      dispatch({ type: 'SELECT_DESTINATION', destination: id, unlocks: saveRef.current.progress });
      audio.sfx(isDestinationUnlocked(id, saveRef.current.progress) ? 'confirm' : 'error');
    },
    launch: () => { audio.sfx('engine'); setPanel(null); go({ type: 'ENTER_HABITAT' }); },
    replayIntro: () => {
      setPanel(null); setIntroReplay(true); introTime.current = 0;
      dispatch({ type: 'GO_COMMAND' }); dispatch({ type: 'REPLAY_INTRO' });
    },
    updateSettings: props.onUpdateSettings,
    addJournalNote(text) {
      const s = simRef.current.getState();
      addJournal({ id: `note-${Date.now()}`, sol: s.currentSol, title: 'Cadet note', body: text, outcomeStatus: 'nominal' });
    },
    restartMission() {
      const d = stateRef.current.destination;
      simRef.current.resetSimulation();
      commit((s) => {
        const n = resetDestinationProgress(s, d);
        return { ...n, journals: { ...n.journals, [d]: props.initialJournal(d) } };
      });
      nonce.current += 1;
      setPanel(null);
      toast('Mission restarted from Sol 1.', 'info');
      dispatch({ type: 'GO_COMMAND' });
      dispatch({ type: 'DEBRIEF_DONE' });
    },
    openClassic: props.onUseClassic,
    goCommand: () => { setPanel(null); go({ type: 'GO_COMMAND' }); },
    endMission: () => api.endMission(),
    fastForward: (n) => doSleep(n),
    openPanel,
    askNova: () => say(novaHint()),
    readArtemis: () => setPanel({ kind: 'artemis' }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [api, closePanel, openPanel, doSleep, go, novaHint, say, toast, props.onUpdateSettings, props.onUseClassic, props.initialJournal]);

  useEffect(() => {
    if (window.location.hash === '#debug') (window as unknown as { __bsGame?: unknown }).__bsGame = { api, act, dispatch, saveRef };
  }, [api, act, dispatch, saveRef]);

  // ---------------- hotkeys ----------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const s = stateRef.current.screen;
      if (!PLAYABLE.includes(s)) return;
      if (e.code === 'Escape') {
        if (panelRef.current) closePanel(); else setPanel({ kind: 'pause' });
        return;
      }
      if (panelRef.current || s === 'navigation') return;
      if (e.code === 'KeyJ') openPanel('journal');
      else if (e.code === 'KeyK') openPanel('achievements');
      else if (e.code === 'KeyO') openPanel('objectives');
      else if (e.code === 'KeyN') say(novaHint());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel, novaHint, openPanel, say, setPanel]);

  // after the cinematic: remember it was seen
  const finishIntro = useCallback(() => {
    audio.stopSpeaking();
    audio.sfx('blip');
    commit((s) => (s.progress.introSeen ? s : { ...s, progress: { ...s.progress, introSeen: true } }));
    setIntroReplay(false);
    go({ type: 'INTRO_FINISHED' }, 350);
  }, [commit, go]);

  // ---------------- derived render data ----------------
  const field = saveRef.current.field[dest];
  const calc = simulation.calculations;
  const ctx = { destination: dest, sim, field, completedSites: save.completedSites };
  const prog = objectiveProgress(ctx);
  const nextObj = nextObjective(ctx);
  const live = useStore(liveStore);
  const hud = useStore(hudStore);
  const unlocks = save.progress;
  const place = placeFor(screen, dest, sim.currentSol);
  const playable = PLAYABLE.includes(screen);
  const paused = panel !== null;
  const bothDone = save.game.missionsCompleted.moon && save.game.missionsCompleted.mars;
  void bothDone;
  const journal = save.journals[dest];
  const storm = isSolarStorm(dest, sim.currentSol);
  const danger = screen === 'surface' && (live.warning === 'critical' || live.warning === 'low_o2' || live.warning === 'low_power');

  const sceneKey = `${screen}:${dest}`;
  const newAchievements = achievements.filter((a) => a.unlocked && !(achSnapshot.current ?? []).includes(a.id));

  const scene = (() => {
    switch (screen) {
      case 'intro':
        return <IntroScene timeRef={introTime} reducedMotion={settings.reducedMotion} onReady={() => setReady(true)} />;
      case 'command':
      case 'navigation':
        return <CommandScene destination={dest} api={api} paused={paused} xp={save.game.xp} moonDone={save.game.missionsCompleted.moon} marsDone={save.game.missionsCompleted.mars} callSign={settings.callSign} />;
      case 'habitat':
        return <HabitatScene destination={dest} api={api} paused={paused} />;
      case 'surface':
        return <SurfaceScene destination={dest} api={api} paused={paused} />;
      case 'debrief':
        return <DebriefScene destination={dest} success={result?.outcome === 'success'} onReady={() => setReady(true)} />;
      default:
        return null;
    }
  })();

  const fallbackCard = (
    <div className="bs-fallback">
      <StaticBackdrop />
      <div className="bs-panel bs-modal bs-modal--narrow" role="alert">
        <div className="bs-kicker">3D view unavailable</div>
        <h2 className="bs-h" style={{ fontSize: '1.4em', margin: '6px 0' }}>{contextLost ? 'The 3D view was interrupted' : 'This device cannot show the 3D game'}</h2>
        <p style={{ lineHeight: 1.6 }}>{contextLost ? 'The browser stopped the graphics. Reload the page; your progress is saved.' : webgl.reason === 'major_performance_caveat' ? 'Your graphics look too slow for first-person 3D.' : 'Your browser does not support WebGL.'} The Classic Mode has all the same mission systems, journal and achievements.</p>
        <div className="bs-row">
          {contextLost && <button className="bs-btn bs-btn--go" onClick={() => window.location.reload()}>Reload</button>}
          {props.onTryAnyway && !contextLost && <button className="bs-btn" onClick={props.onTryAnyway}>Try 3D anyway</button>}
          <button className="bs-btn bs-btn--go" onClick={props.onUseClassic}>Open Classic Mode</button>
        </div>
      </div>
    </div>
  );

  const crashFallback = () => (
    <div className="bs-fallback">
      <div className="bs-panel bs-modal bs-modal--narrow" role="alert">
        <div className="bs-kicker">Something went wrong</div>
        <h2 className="bs-h" style={{ fontSize: '1.4em', margin: '6px 0' }}>The 3D scene stopped</h2>
        <p style={{ lineHeight: 1.6 }}>Your progress is saved. You can try again, or open Classic Mode.</p>
        <div className="bs-row">
          <button className="bs-btn bs-btn--go" onClick={() => window.location.reload()}>Reload</button>
          <button className="bs-btn" onClick={props.onUseClassic}>Open Classic Mode</button>
        </div>
      </div>
    </div>
  );

  const novaTalking = novaText !== null;

  return (
    <div className={`bs-root ${settings.textSize === 'large' ? 'bs-large' : ''} ${settings.reducedMotion ? 'bs-reduce' : ''}`}>
      <div className="bs-canvas">
        {canRender3D ? (
          <ErrorBoundary resetKey={sceneKey} fallback={crashFallback}>
            <Canvas
              shadows={!settings.lowPerformanceMode}
              dpr={settings.lowPerformanceMode ? 1 : [1, 1.75]}
              camera={{ fov: 72, near: 0.1, far: 9000, position: [0, 1.7, 8] }}
              gl={{ antialias: !settings.lowPerformanceMode, powerPreference: 'high-performance' }}
              onCreated={(st) => {
                const gl = st.gl;
                if (window.location.hash === '#debug') (window as unknown as { __bsThree?: unknown }).__bsThree = st;
                gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); props.onContextLost(); });
              }}
            >
              {scene}
            </Canvas>
          </ErrorBoundary>
        ) : screen === 'intro' ? <StaticBackdrop /> : fallbackCard}
      </div>

      {/* ---------- intro ---------- */}
      {screen === 'intro' && (
        <IntroOverlay
          key={introReplay ? 'replay' : 'first'} timeRef={introTime} captions={settings.captionsEnabled} reducedMotion={settings.reducedMotion}
          audioOn={settings.audioEnabled} replay={introReplay} onFinish={finishIntro}
          onToggleAudio={() => props.onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
          onToggleCaptions={() => props.onUpdateSettings({ captionsEnabled: !settings.captionsEnabled })}
        />
      )}

      {/* ---------- HUD ---------- */}
      {canRender3D && playable && screen !== 'navigation' && (
        <div className="bs-layer">
          <Crosshair />
          <Compass />
          {screen === 'surface' && <Radar />}
          {screen !== 'surface' && (
            <div className="bs-panel bs-gauges bs-ghost" style={{ top: 22, bottom: 'auto', width: 220 }}>
              <div className="bs-kicker">Sol {sim.currentSol} / {sim.totalSols}</div>
              {([['O₂', sim.oxygenLevel], ['H₂O', sim.waterLevel], ['PWR', sim.batteryCharge], ['Food', field.foodLevel]] as [string, number][]).map(([k, v]) => (
                <div key={k} className="bs-gauge" role="meter" aria-label={k} aria-valuenow={Math.round(v)}><span>{k}</span><div className={`bs-bar ${v <= 15 ? 'is-crit' : v <= 30 ? 'is-low' : ''}`}><i style={{ width: `${v}%` }} /></div><b>{Math.round(v)}</b></div>
              ))}
              <div className="bs-gauge"><span>Rad</span><div className="bs-bar"><i style={{ width: `${field.radiationDose}%`, background: 'linear-gradient(90deg,#b36bff,#ff5a4a)' }} /></div><b>{Math.round(field.radiationDose)}</b></div>
            </div>
          )}
          <ObjectiveTracker
            title={screen === 'command' && prog.done === 0 ? 'Choose a mission at the glowing table' : nextObj ? nextObj.title : 'All objectives complete!'}
            done={prog.done} total={prog.total}
            hint={screen === 'command' && prog.done === 0 ? 'Walk to the hologram table and press E.' : nextObj?.hint} />
          {screen === 'surface' && <SuitGauges showRover />}
          {screen === 'surface' && hud.driving && <RoverDash battery={live.roverBattery} />}
          <div className="bs-chips">
            <span className="bs-chip">SOL {sim.currentSol}/{sim.totalSols}</span>
            {screen === 'surface' && <span className={`bs-chip ${live.evaRemaining < 90 ? 'is-warn' : ''}`}>AIR ≈ {Math.floor(live.evaRemaining / 60)}:{String(live.evaRemaining % 60).padStart(2, '0')}</span>}
            {storm && <span className="bs-chip is-bad">☀ SOLAR STORM</span>}
            {screen === 'surface' && hud.inColdShadow && <span className="bs-chip is-warn">❄ COLD SHADOW</span>}
            {screen === 'surface' && live.radiation >= 60 && <span className="bs-chip is-bad">☢ RADIATION HIGH</span>}
          </div>
          <Prompt />
          <div className={`bs-vignette ${danger ? 'on' : storm && screen === 'surface' ? 'on storm' : ''}`} />
          <Toasts items={toasts} />
          <NovaBubble text={novaText} talking={novaTalking} />
          <ControlsHint screen={screen as 'surface' | 'habitat' | 'command'} />
          <PlaceBanner key={sceneKey} title={place.title} subtitle={place.subtitle} />
          {!hud.locked && !paused && ready && (
            <div className="bs-panel bs-ghost" style={{ position: 'absolute', left: '50%', bottom: 90, transform: 'translateX(-50%)', padding: '6px 14px', fontSize: 12, color: 'var(--dim)' }}>Click the view to capture the mouse · drag to look</div>
          )}
        </div>
      )}

      {/* ---------- debrief ---------- */}
      {screen === 'debrief' && result && (
        <DebriefOverlay
          destination={dest} result={result} xpTotal={save.game.xp} achievements={newAchievements}
          nextUnlocked={dest === 'moon' && result.outcome === 'success'}
          onContinue={() => { achSnapshot.current = achievements.filter((a) => a.unlocked).map((a) => a.id); go({ type: 'DEBRIEF_DONE' }); }}
          onRetry={() => act.restartMission()}
          onResume={() => { dispatch({ type: 'DEBRIEF_DONE' }); dispatch({ type: 'ENTER_HABITAT' }); }}
        />
      )}

      {/* ---------- modal panels ---------- */}
      {panel && playable && (
        <div className="bs-layer">
          <Panels
            panel={panel} screen={screen} destination={dest} sim={sim} calc={calc} field={field} save={save} settings={settings}
            achievements={achievements} journal={journal} completed={save.completedSites} unlocks={unlocks} notice={state.notice}
            novaHint={novaHint()} act={act}
          />
        </div>
      )}

      {props.saveWarning && (
        <div role="status" className="bs-panel" style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 30, padding: '8px 14px', fontSize: 12, color: 'var(--amber)' }}>
          Progress can’t be saved on this device right now. You can keep playing, but it will be lost when you close the page.
        </div>
      )}

      {/* ---------- loading / transition cover ---------- */}
      <div className={`bs-cover ${(ready || !canRender3D) && !leaving ? 'hide' : 'show'}`} aria-hidden={(ready || !canRender3D) && !leaving} role="status">
        <div className="bs-spinner" />
        <div className="bs-kicker">{leaving ? 'Traveling…' : `Preparing ${MISSIONS[dest].name.split(':')[0]}…`}</div>
      </div>
    </div>
  );
}
