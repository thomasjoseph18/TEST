// Pure progression reducers over the SaveGame. Every future game system (Moon/Mars science
// tasks, habitat modules, debrief) reports into these instead of touching achievements directly.
import type { Destination } from '../types.ts';
import { EXPLORATION_POINTS } from '../data/exploration.ts';
import { evaluateAchievements, type GameEvent } from './achievements.ts';
import type { SaveGame } from './save.ts';
import { getInitialSimulationState } from './simulation.ts';
import { createFieldState } from './field.ts';

export function siteIdsFor(destination: Destination): string[] {
  return EXPLORATION_POINTS.filter((p) => p.destination === destination).map((p) => p.id);
}

/** Apply one game event: unlock achievements it earns and update progression flags. */
export function applyGameEvent(save: SaveGame, event: GameEvent): SaveGame {
  let next = save;

  const unlocks = evaluateAchievements(event);
  if (unlocks.length > 0) {
    const achievements = { ...save.achievements };
    for (const u of unlocks) {
      if (!achievements[u.id]) achievements[u.id] = u.sol !== undefined ? { unlockedAtSol: u.sol } : {};
    }
    next = { ...next, achievements };
  }

  // Mars unlocks only after a genuine Moon victory.
  if (event.type === 'sol_completed' && event.facts.destination === 'moon' && event.facts.status === 'victory') {
    if (!next.progress.moonTrainingComplete) next = { ...next, progress: { ...next.progress, moonTrainingComplete: true } };
  }
  return next;
}

/**
 * Called by Moon/Mars science tasks when a task is actually COMPLETED (not when a marker is clicked).
 * Unknown site ids and wrong-destination ids are rejected, completion is idempotent.
 */
export function completeSiteTask(save: SaveGame, destination: Destination, siteId: string): SaveGame {
  const valid = siteIdsFor(destination);
  if (!valid.includes(siteId)) return save;
  const completed = save.completedSites.includes(siteId) ? save.completedSites : [...save.completedSites, siteId];
  const withSite = completed === save.completedSites ? save : { ...save, completedSites: completed };
  return applyGameEvent(withSite, {
    type: 'site_task_completed',
    destination,
    completedSiteIds: completed,
    allSiteIds: valid,
  });
}

/** Viewing a site in the classic Exploration screen is informational only; it never unlocks anything. */
export function markSiteViewed(save: SaveGame, siteId: string): SaveGame {
  if (save.viewedSites.includes(siteId)) return save;
  return { ...save, viewedSites: [...save.viewedSites, siteId] };
}

/**
 * Restart ONE destination's mission from the game: simulation, field state and completed sites for that
 * destination are reset; achievements, XP and the other destination are untouched.
 */
export function resetDestinationProgress(save: SaveGame, destination: Destination): SaveGame {
  const siteIds = new Set(siteIdsFor(destination));
  return {
    ...save,
    simulations: { ...save.simulations, [destination]: getInitialSimulationState(destination) },
    field: { ...save.field, [destination]: createFieldState() },
    completedSites: save.completedSites.filter((id) => !siteIds.has(id)),
    game: {
      ...save.game,
      quizCorrect: save.game.quizCorrect.filter((id) => !siteIds.has(id)),
      quizAnswered: save.game.quizAnswered.filter((id) => !siteIds.has(id)),
      missionsCompleted: { ...save.game.missionsCompleted, [destination]: false },
    },
  };
}
