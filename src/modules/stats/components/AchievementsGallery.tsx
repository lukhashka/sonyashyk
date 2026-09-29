import { useTranslation } from 'react-i18next';
import { getAllAchievements } from '@/core/gamification/achievements';
import { useUnlockedAchievements } from '@/core/stats/queries';
import { Card, Skeleton } from '@/shared/ui';

/** Trophy shelf: unlocked achievements in colour, locked ones greyed with their hint. */
export function AchievementsGallery() {
  const { t, i18n } = useTranslation('stats');
  const { data, isPending, isError } = useUnlockedAchievements();
  const all = getAllAchievements();
  const unlockedAt = new Map((data ?? []).map((u) => [u.achievement_id, u.unlocked_at]));
  const count = all.filter((a) => unlockedAt.has(a.id)).length;
  const date = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section aria-labelledby="ach-heading" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ach-heading" className="font-heading text-xl font-bold">
          {t('achievements.title')} 🏆
        </h2>
        {data && (
          <p className="text-sm font-semibold text-text-muted">
            {t('achievements.count', { done: count, total: all.length })}
          </p>
        )}
      </div>
      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <Card>{t('achievements.error')}</Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {all.map((a) => {
            const at = unlockedAt.get(a.id);
            return (
              <li
                key={a.id}
                className={`flex flex-col items-center gap-1 rounded-lg border p-4 text-center ${
                  at ? 'border-primary bg-primary-soft' : 'border-border bg-surface-muted'
                }`}
              >
                <span className={`text-4xl ${at ? '' : 'opacity-40 grayscale'}`} aria-hidden="true">
                  {a.emoji}
                </span>
                <p className={`font-heading text-sm font-bold ${at ? '' : 'text-text-muted'}`}>
                  {t(a.title)}
                </p>
                <p className="text-xs text-text-muted">
                  {at ? '' : '🔒 '}
                  {at
                    ? t('achievements.unlockedOn', { date: date.format(new Date(at)) })
                    : t(a.description)}
                </p>
                <span className="sr-only">
                  {at ? t('achievements.stateUnlocked') : t('achievements.stateLocked')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
