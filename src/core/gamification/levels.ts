/** Total XP needed to reach `level` (level 1 = 0 XP). Gentle quadratic curve. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 25 * (l - 1) * l;
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP needed to finish the current level. */
  needed: number;
}

export function getLevel(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return { level, into: xp - xpForLevel(level), needed: xpForLevel(level + 1) - xpForLevel(level) };
}

/** Law-themed titles; index = min(level, last) - 1 buckets of 3 levels each. */
export const LEVEL_TITLE_KEYS = ['freshman', 'paralegal', 'lawyer', 'advocate', 'judge'] as const;

export function getLevelTitleKey(level: number): (typeof LEVEL_TITLE_KEYS)[number] {
  const idx = Math.min(LEVEL_TITLE_KEYS.length - 1, Math.floor((Math.max(1, level) - 1) / 3));
  return LEVEL_TITLE_KEYS[idx] ?? 'freshman';
}
