// Mission objectives, site-task definitions and final scoring. Pure and testable.
import type { Destination, HabitatSimulationState } from '../types.ts';
import { HABITAT_SYSTEMS, type FieldState } from './field.ts';
import { siteIdsFor } from './progress.ts';

export interface ObjectiveContext {
  destination: Destination;
  sim: HabitatSimulationState;
  field: FieldState;
  completedSites: string[];
}

export interface ObjectiveDef {
  id: string;
  title: string;
  /** Child-friendly pointer on how to do it (shown by NOVA and in the objectives list). */
  hint: string;
  done: (c: ObjectiveContext) => boolean;
}

const site = (id: string) => (c: ObjectiveContext) => c.completedSites.includes(id);
const flag = (f: string) => (c: ObjectiveContext) => c.field.flags[f] === true;
const sols30 = (c: ObjectiveContext) => c.sim.currentSol >= c.sim.totalSols && c.sim.missionStatus === 'victory';
const habitatChecked = (c: ObjectiveContext) => HABITAT_SYSTEMS.every((s) => c.field.inspected.includes(s));

export const OBJECTIVES: Record<Destination, ObjectiveDef[]> = {
  moon: [
    { id: 'eva', title: 'Step outside through the airlock', hint: 'Walk to the airlock door in the habitat and press E.', done: flag('eva_started') },
    { id: 'solar', title: 'Wipe dust off the solar array', hint: 'The solar array stands next to the habitat. Press E beside it.', done: flag('solar_cleaned') },
    { id: 'sample', title: 'Collect a regolith sample', hint: 'Find the sample station marked on your compass and hold E.', done: (c) => c.field.samples.some((s) => s.startsWith('moon')) },
    { id: 'rim', title: 'Survey the Shackleton Rim', hint: 'Climb to the rim overlook and run the lidar scan.', done: site('moon-shackleton-rim') },
    { id: 'rover', title: 'Drive the rover to the traverse station', hint: 'Press E at the rover to board it. W drives, A and D steer.', done: site('moon-lunar-rover') },
    { id: 'psr', title: 'Scan the cold trap for water ice', hint: 'The shadowed crater is far away. The rover saves oxygen.', done: site('moon-psr-cold-trap') },
    { id: 'heritage', title: 'Visit the Apollo heritage memorial', hint: 'Follow the compass to the memorial near the landing pad.', done: site('moon-apollo-11') },
    { id: 'systems', title: 'Inspect every life-support system', hint: 'Walk through the habitat and press E at each machine.', done: habitatChecked },
    { id: 'sols', title: 'Keep the crew safe for 30 Sols', hint: 'Rest in the crew bunk to start the next Sol.', done: sols30 },
  ],
  mars: [
    { id: 'eva', title: 'Step outside through the airlock', hint: 'Walk to the airlock door in the habitat and press E.', done: flag('eva_started') },
    { id: 'solar', title: 'Wipe dust off the solar array', hint: 'Mars dust settles on panels. Press E beside the array.', done: flag('solar_cleaned') },
    { id: 'sample', title: 'Collect a Mars rock sample', hint: 'Find the sample station marked on your compass and hold E.', done: (c) => c.field.samples.some((s) => s.startsWith('mars')) },
    { id: 'delta', title: 'Study the Jezero river delta', hint: 'Walk to the delta fan and take a sediment core.', done: site('mars-jezero-delta') },
    { id: 'moxie', title: 'Test MOXIE oxygen production', hint: 'MOXIE turns Martian air into breathable oxygen.', done: site('mars-moxie-station') },
    { id: 'dust', title: 'Raise the weather mast in the dust corridor', hint: 'Use the rover to reach the mast site quickly.', done: site('mars-dust-storm-basin') },
    { id: 'ice', title: 'Radar-scan the buried glacier', hint: 'Drive the rover out to the ridge and deploy the radar.', done: site('mars-subsurface-glacier') },
    { id: 'systems', title: 'Inspect every life-support system', hint: 'Walk through the habitat and press E at each machine.', done: habitatChecked },
    { id: 'sols', title: 'Keep the crew safe for 30 Sols', hint: 'Rest in the crew bunk to start the next Sol.', done: sols30 },
  ],
};

export function objectiveStatus(c: ObjectiveContext): { def: ObjectiveDef; done: boolean }[] {
  return OBJECTIVES[c.destination].map((def) => ({ def, done: def.done(c) }));
}

export function objectiveProgress(c: ObjectiveContext): { done: number; total: number } {
  const list = objectiveStatus(c);
  return { done: list.filter((o) => o.done).length, total: list.length };
}

/** The first unfinished objective, in order. Null when everything is done. */
export function nextObjective(c: ObjectiveContext): ObjectiveDef | null {
  return objectiveStatus(c).find((o) => !o.done)?.def ?? null;
}

// ---------------------------------------------------------------------------------------------
// Site tasks: what the player actually does at each science location.
// ---------------------------------------------------------------------------------------------
export interface Quiz {
  question: string;
  options: [string, string, string];
  correct: 0 | 1 | 2;
  explanation: string;
}

export interface SiteTask {
  siteId: string;
  /** Verb phrase shown on the interaction prompt, e.g. "Run the lidar scan". */
  action: string;
  /** Seconds the player must hold E. */
  holdSeconds: number;
  /** Suit power the task uses (0-100). */
  powerCost: number;
  quiz: Quiz;
}

export const SITE_TASKS: SiteTask[] = [
  {
    siteId: 'moon-shackleton-rim',
    action: 'Run the lidar scan of the rim',
    holdSeconds: 3,
    powerCost: 4,
    quiz: {
      question: 'Why is the Shackleton Crater rim a good place for a Moon base?',
      options: ['It is always warm there', 'Sunlight reaches it almost all year', 'It has a thick atmosphere'],
      correct: 1,
      explanation: 'The Moon’s axis is barely tilted, so some peaks at the south pole stay in sunlight almost all the time. That means steady solar power.',
    },
  },
  {
    siteId: 'moon-psr-cold-trap',
    action: 'Scan the crater floor for water ice',
    holdSeconds: 4,
    powerCost: 6,
    quiz: {
      question: 'Why could water ice survive in a permanently shadowed crater?',
      options: ['The floor never sees sunlight, so it stays extremely cold', 'Rain keeps refilling it', 'The ice is protected by wind'],
      correct: 0,
      explanation: 'Sunlight has not reached these crater floors for billions of years. At around −246 °C, water ice stays frozen solid.',
    },
  },
  {
    siteId: 'moon-apollo-11',
    action: 'Read the Apollo heritage plaque',
    holdSeconds: 2,
    powerCost: 1,
    quiz: {
      question: 'In which year did Apollo 11 land the first people on the Moon?',
      options: ['1961', '1969', '1972'],
      correct: 1,
      explanation: 'Neil Armstrong and Buzz Aldrin landed in the Sea of Tranquility on July 20, 1969. Artemis builds on what Apollo began.',
    },
  },
  {
    siteId: 'moon-lunar-rover',
    action: 'Log the rover traverse station',
    holdSeconds: 2,
    powerCost: 1,
    quiz: {
      question: 'On the Moon your rover bounces more than on Earth. Why?',
      options: ['The wheels are square', 'Lunar gravity is about one sixth of Earth’s', 'The Moon is made of foam'],
      correct: 1,
      explanation: 'Gravity on the Moon is about one sixth of Earth’s, so everything weighs less and bounces higher.',
    },
  },
  {
    siteId: 'mars-jezero-delta',
    action: 'Take a sediment core from the delta',
    holdSeconds: 3,
    powerCost: 4,
    quiz: {
      question: 'Jezero Crater has a river delta. What does that tell scientists?',
      options: ['A lake once existed there', 'Mars has oceans today', 'The crater was built by robots'],
      correct: 0,
      explanation: 'Deltas form where flowing water drops sediment into a lake. Ancient lakes are a good place to look for signs of past life.',
    },
  },
  {
    siteId: 'mars-moxie-station',
    action: 'Start the MOXIE oxygen test',
    holdSeconds: 3,
    powerCost: 3,
    quiz: {
      question: 'MOXIE makes oxygen from which gas in the Martian air?',
      options: ['Nitrogen', 'Carbon dioxide', 'Helium'],
      correct: 1,
      explanation: 'Mars’s air is mostly carbon dioxide. MOXIE splits it, and astronauts could breathe the oxygen or use it for rocket fuel.',
    },
  },
  {
    siteId: 'mars-dust-storm-basin',
    action: 'Raise the weather mast',
    holdSeconds: 3,
    powerCost: 4,
    quiz: {
      question: 'Why do dust storms matter to a Mars base?',
      options: ['They can block sunlight from solar panels', 'They make gravity stronger', 'They turn water into ice'],
      correct: 0,
      explanation: 'Fine dust in the air and on panels cuts the electricity solar arrays make, so crews must plan power carefully.',
    },
  },
  {
    siteId: 'mars-subsurface-glacier',
    action: 'Deploy the ground-penetrating radar',
    holdSeconds: 4,
    powerCost: 6,
    quiz: {
      question: 'Why is buried ice useful to future Mars explorers?',
      options: ['It can be melted for water and split for oxygen and fuel', 'It makes the ground softer to walk on', 'It lights up at night'],
      correct: 0,
      explanation: 'Water is drink, air and rocket fuel. Using ice found on site means less weight to launch from Earth.',
    },
  },
];

export function taskForSite(siteId: string): SiteTask | undefined {
  return SITE_TASKS.find((t) => t.siteId === siteId);
}

// ---------------------------------------------------------------------------------------------
// XP and final results
// ---------------------------------------------------------------------------------------------
export const XP = { site: 40, quiz: 15, sample: 10, solSurvived: 5, star: 100 } as const;

export interface ResultsInput extends ObjectiveContext {
  quizCorrect: string[];
}

export interface MissionResult {
  outcome: 'success' | 'incomplete' | 'failed';
  stars: 0 | 1 | 2 | 3;
  xp: number;
  objectivesDone: number;
  objectivesTotal: number;
  sitesDone: number;
  sitesTotal: number;
  solsSurvived: number;
  lines: { label: string; value: string; good: boolean }[];
}

export function computeMissionResult(r: ResultsInput): MissionResult {
  const { sim, field, destination, completedSites } = r;
  const sites = siteIdsFor(destination);
  const sitesDone = sites.filter((s) => completedSites.includes(s)).length;
  const prog = objectiveProgress(r);
  const solsSurvived = Math.max(0, sim.currentSol - (sim.missionStatus === 'critical' ? 1 : 0));

  const failed = sim.missionStatus === 'critical' || field.crewHealth <= 0;
  const won = sim.missionStatus === 'victory' && field.crewHealth > 0;
  const outcome: MissionResult['outcome'] = failed ? 'failed' : won ? 'success' : 'incomplete';

  let stars = 0;
  if (won) stars += 1;
  if (won && sitesDone === sites.length) stars += 1;
  const stewardship =
    sim.oxygenLevel >= 60 && sim.waterLevel >= 40 && sim.batteryCharge >= 30 && field.foodLevel >= 30 && field.crewHealth >= 70;
  if (won && stewardship) stars += 1;

  const quizXp = r.quizCorrect.filter((id) => sites.includes(id)).length * XP.quiz;
  const xp = solsSurvived * XP.solSurvived + sitesDone * XP.site + field.samples.length * XP.sample + quizXp + stars * XP.star;

  const lines = [
    { label: 'Sols completed', value: `${solsSurvived} / ${sim.totalSols}`, good: won },
    { label: 'Science sites finished', value: `${sitesDone} / ${sites.length}`, good: sitesDone === sites.length },
    { label: 'Objectives complete', value: `${prog.done} / ${prog.total}`, good: prog.done === prog.total },
    { label: 'Oxygen in the habitat', value: `${Math.round(sim.oxygenLevel)}%`, good: sim.oxygenLevel >= 60 },
    { label: 'Water', value: `${Math.round(sim.waterLevel)}%`, good: sim.waterLevel >= 40 },
    { label: 'Battery', value: `${Math.round(sim.batteryCharge)}%`, good: sim.batteryCharge >= 30 },
    { label: 'Food', value: `${Math.round(field.foodLevel)}%`, good: field.foodLevel >= 30 },
    { label: 'Crew health', value: `${Math.round(field.crewHealth)}%`, good: field.crewHealth >= 70 },
    { label: 'Suit emergencies', value: `${field.recoveries}`, good: field.recoveries === 0 },
  ];

  return {
    outcome,
    stars: Math.min(3, stars) as MissionResult['stars'],
    xp,
    objectivesDone: prog.done,
    objectivesTotal: prog.total,
    sitesDone,
    sitesTotal: sites.length,
    solsSurvived,
    lines,
  };
}

/** Level from total XP: a new rank every 300 XP. */
export function rankFor(xp: number): { level: number; title: string; next: number } {
  const titles = ['Cadet', 'Flight Cadet', 'Junior Astronaut', 'Mission Specialist', 'Lunar Pioneer', 'Mars Pioneer', 'Artemis Candidate'];
  const level = Math.floor(Math.max(0, xp) / 300);
  return { level, title: titles[Math.min(level, titles.length - 1)], next: (level + 1) * 300 };
}
