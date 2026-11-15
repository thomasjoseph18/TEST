// Pure achievement rules. Achievements unlock from real mission events only,
// never from clicking a button or marker. IDs must exist in INITIAL_ACHIEVEMENTS.
import type { Destination } from '../types.ts';
import type { SolFacts } from './simulation.ts';

export const ACHIEVEMENT_IDS = [
  'first_touchdown',
  'solar_engineer',
  'ice_miner',
  'water_conservation',
  'oxygen_master',
  'power_engineer',
  'midway_explorer',
  'mission_graduate',
  'planetary_geologist',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export type GameEvent =
  | { type: 'mission_started'; destination: Destination }
  | { type: 'solar_cleaned'; dustBefore: number }
  | { type: 'ice_smelter_started' }
  | { type: 'sol_completed'; facts: SolFacts }
  /** A site's science task was actually completed (not merely selected). */
  | { type: 'site_task_completed'; destination: Destination; completedSiteIds: string[]; allSiteIds: string[] };

/** Dust % at which cleaning counts as a real engineering decision. Matches the on-screen criteria text. */
export const SOLAR_CLEAN_THRESHOLD = 10;

export function evaluateAchievements(event: GameEvent): { id: AchievementId; sol?: number }[] {
  switch (event.type) {
    case 'mission_started':
      return [{ id: 'first_touchdown', sol: 1 }];
    case 'solar_cleaned':
      return event.dustBefore >= SOLAR_CLEAN_THRESHOLD ? [{ id: 'solar_engineer' }] : [];
    case 'ice_smelter_started':
      return [{ id: 'ice_miner' }];
    case 'sol_completed': {
      const f = event.facts;
      const out: { id: AchievementId; sol?: number }[] = [];
      if (f.status === 'critical') return out;
      if ((f.waterRecyclerMode === 'advanced' || f.waterRecyclerMode === 'hyper') && f.water > 15) {
        out.push({ id: 'water_conservation', sol: f.sol });
      }
      if ((f.o2Mode === 'standard' || f.o2Mode === 'boost') && f.oxygen > 90) {
        out.push({ id: 'oxygen_master', sol: f.sol });
      }
      if (f.essentialsPowered && f.netPowerKw > 0) out.push({ id: 'power_engineer', sol: f.sol });
      if (f.sol === 15 && f.oxygen > 50 && f.water > 50 && f.integrity > 70) {
        out.push({ id: 'midway_explorer', sol: f.sol });
      }
      if (f.sol === 30 && f.status === 'victory') out.push({ id: 'mission_graduate', sol: f.sol });
      return out;
    }
    case 'site_task_completed': {
      const done = new Set(event.completedSiteIds);
      const all = event.allSiteIds.length > 0 && event.allSiteIds.every((id) => done.has(id));
      return all ? [{ id: 'planetary_geologist' }] : [];
    }
  }
}
