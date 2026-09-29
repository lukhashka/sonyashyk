import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '@/shared/ui';

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  return (
    <Card className="bg-[image:var(--gradient-hero)]">
      <EmptyState emoji="🌻" title={t('welcome')}>
        {t('hint')}
      </EmptyState>
    </Card>
  );
}
