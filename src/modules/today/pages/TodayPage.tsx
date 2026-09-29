import { useTranslation } from 'react-i18next';
import { DayComplete } from '@/core/daily/components/DayComplete';
import { TaskList } from '@/core/daily/components/TaskList';
import { useDailyPlan } from '@/core/daily/queries';
import { Card, EmptyState, Skeleton } from '@/shared/ui';

export default function TodayPage() {
  const { t } = useTranslation('today');
  const { data: plan, isPending, isError } = useDailyPlan();

  if (isPending) return <Skeleton className="h-40 w-full" />;
  if (isError) return <EmptyState emoji="🌧️" title={t('daily.error', { ns: 'common' })} />;

  const allDone = plan.tasks.length > 0 && plan.tasks.every((task) => task.completed_at);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('heading')}</h1>
      {allDone && <DayComplete />}
      {plan.tasks.length === 0 ? (
        <Card>
          <EmptyState emoji="🌸" title={t('empty')} />
        </Card>
      ) : (
        <TaskList plan={plan} />
      )}
    </div>
  );
}
