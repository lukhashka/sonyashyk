import { useTranslation } from 'react-i18next';
import { Card, Emoji } from '@/shared/ui';

/** Gentle "day complete" celebration (confetti comes with the Polish phase). */
export function DayComplete() {
  const { t } = useTranslation();
  return (
    <Card role="status" className="bg-[image:var(--gradient-hero)] text-center">
      <p className="text-4xl">
        <Emoji symbol="🎉" />
      </p>
      <p className="font-heading text-lg font-bold">{t('daily.dayComplete')}</p>
      <p className="text-text-muted">{t('daily.dayCompleteHint')}</p>
    </Card>
  );
}
