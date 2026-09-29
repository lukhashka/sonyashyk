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

/** Titles with the first level of each tier; the last tier lasts forever. */
const LEVEL_TIERS = [
  { key: 'miniCat', from: 1 },
  { key: 'seniorCat', from: 2 },
  { key: 'yum', from: 4 },
  { key: 'paralegal', from: 6 },
  { key: 'lawyer', from: 9 },
  { key: 'advocate', from: 12 },
  { key: 'judge', from: 15 },
] as const;

export type LevelTitleKey = (typeof LEVEL_TIERS)[number]['key'];

export const LEVEL_TITLE_KEYS: readonly LevelTitleKey[] = LEVEL_TIERS.map((t) => t.key);

export function getLevelTitleKey(level: number): LevelTitleKey {
  const l = Math.max(1, Math.floor(level));
  let key: LevelTitleKey = LEVEL_TIERS[0].key;
  for (const tier of LEVEL_TIERS) if (l >= tier.from) key = tier.key;
  return key;
}
