import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CORE_ACHIEVEMENTS, getAchievementCheckRpcs, getAllAchievements } from './achievements';
import { uk } from '@/core/i18n/locales/uk';
import { en } from '@/core/i18n/locales/en';

const sql = (name: string) =>
  readFileSync(resolve(process.cwd(), 'supabase/migrations', name), 'utf-8');

describe('achievements', () => {
  it('has unique ids that are valid database ids', () => {
    const ids = getAllAchievements().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]{0,63}$/);
  });

  it('keeps core definitions in sync with the SQL rules', () => {
    const core = sql('20260929000006_stats_achievements.sql');
    for (const a of CORE_ACHIEVEMENTS) expect(core).toContain(`('${a.id}',`);
  });

  it('keeps module definitions in sync with the SQL rules', () => {
    const ew = sql('20260929000007_ew_stats.sql');
    for (const a of getAllAchievements().filter((x) => x.id.startsWith('ew-'))) {
      expect(ew).toContain(`('${a.id}',`);
    }
  });

  it('has a title and a hint translation for every core achievement in both locales', () => {
    for (const bundle of [uk.common.achievements, en.common.achievements] as Record<
      string,
      unknown
    >[]) {
      for (const a of CORE_ACHIEVEMENTS) {
        const entry = bundle[a.id] as { title?: string; hint?: string } | undefined;
        expect(entry?.title, a.id).toBeTruthy();
        expect(entry?.hint, a.id).toBeTruthy();
      }
    }
  });

  it('checks the core rules plus each module RPC', () => {
    expect(getAchievementCheckRpcs()).toEqual(['check_core_achievements', 'ew_check_achievements']);
  });
});
