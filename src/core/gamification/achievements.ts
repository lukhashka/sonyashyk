import { registry } from '@/core/modules/registry';
import type { AchievementDefinition } from '@/core/modules/types';

/** RPC that evaluates the core rules; the SQL lives in migration `stats_achievements`. */
export const CORE_CHECK_RPC = 'check_core_achievements';

const core = (id: string, emoji: string): AchievementDefinition => ({
  id,
  emoji,
  title: `common:achievements.${id}.title`,
  description: `common:achievements.${id}.hint`,
});

/** Achievements owned by the app core. Ids must match `check_core_achievements()` in SQL. */
export const CORE_ACHIEVEMENTS: AchievementDefinition[] = [
  core('first-day', '🌻'),
  core('streak-3', '🐱'),
  core('streak-7', '🔥'),
  core('streak-14', '🌸'),
  core('streak-30', '🏆'),
  core('days-10', '📅'),
  core('days-50', '🗓️'),
  core('xp-100', '✨'),
  core('xp-500', '🍀'),
  core('xp-1000', '💎'),
  core('xp-2500', '👑'),
  core('level-4', '📚'),
  core('level-7', '⚖️'),
  core('level-10', '👩‍⚖️'),
  core('tasks-25', '✅'),
  core('tasks-100', '🍰'),
];

/** Core achievements followed by every module's own, in registry order. */
export function getAllAchievements(): AchievementDefinition[] {
  return [...CORE_ACHIEVEMENTS, ...registry.flatMap((m) => m.achievements ?? [])];
}

/** RPC names to call when checking achievements: the core one plus each module's. */
export function getAchievementCheckRpcs(): string[] {
  const rpcs = registry.flatMap((m) => (m.checkAchievementsRpc ? [m.checkAchievementsRpc] : []));
  return [CORE_CHECK_RPC, ...rpcs];
}
