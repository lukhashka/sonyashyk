import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { Avatar } from '@/core/auth/Avatar';
import { useProfile } from '@/core/auth/profile';
import { useStreak } from '@/core/daily/queries';
import { getDayPart } from '@/core/lib/greeting';
import { Badge } from '@/shared/ui';
import { ThemeToggle } from './ThemeToggle';

export function TopBar() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const { data: streak } = useStreak();
  const part = getDayPart(new Date().getHours());
  const name = profile?.display_name || t('defaultName');
  const greeting = t(`greeting.${part}`, { name });

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <p className="text-base font-bold md:text-lg">{greeting}</p>
      <div className="flex items-center gap-2">
        <Badge>
          <Flame size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{streak?.current ?? 0}</span>
        </Badge>
        <ThemeToggle />
        <Avatar path={profile?.avatar_url} emoji={profile?.avatar_emoji ?? '🌻'} size={36} />
      </div>
    </header>
  );
}
