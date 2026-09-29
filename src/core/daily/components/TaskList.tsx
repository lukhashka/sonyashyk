import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { registry } from '@/core/modules/registry';
import { Badge, Button, Card, Emoji, Progress } from '@/shared/ui';
import { useReportProgress, type DailyPlan, type DailyTask } from '../queries';

function TaskRow({ task, studyDay }: { task: DailyTask; studyDay: string }) {
  const { t } = useTranslation();
  const report = useReportProgress();
  const done = task.completed_at !== null;
  const title = t(task.title_key);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            done ? 'bg-success text-[#3d2c2e]' : 'bg-primary-soft'
          }`}
        >
          {done ? <Check size={18} aria-hidden="true" /> : <Emoji symbol={task.emoji ?? '🌸'} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${done ? 'text-text-muted line-through' : ''}`}>{title}</p>
          <p className="text-sm text-text-muted">
            {task.estimated_minutes
              ? t('daily.minutes', { count: task.estimated_minutes }) + ' · '
              : ''}
            {t('daily.xp', { count: task.xp })}
          </p>
        </div>
        {!done && task.route && (
          <Link
            to={task.route}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 font-semibold text-[#3d2c2e]"
          >
            {t('daily.go')}
          </Link>
        )}
        {!done && !task.route && (
          <Button
            variant="soft"
            disabled={report.isPending}
            onClick={() => report.mutate({ task, progress: task.target, studyDay })}
          >
            {t('daily.markDone')}
          </Button>
        )}
        {done && <Badge>{t('daily.done')}</Badge>}
      </div>
      {task.target > 1 && (
        <Progress
          value={task.progress}
          max={task.target}
          label={`${title}: ${task.progress}/${task.target}`}
        />
      )}
      {report.isError && (
        <p role="alert" className="text-sm text-danger">
          {t('daily.error')}
        </p>
      )}
    </li>
  );
}

/** Today's tasks grouped by module. */
export function TaskList({ plan }: { plan: DailyPlan }) {
  const { t } = useTranslation();
  const groups = new Map<string, DailyTask[]>();
  for (const task of plan.tasks) {
    groups.set(task.module_id, [...(groups.get(task.module_id) ?? []), task]);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([moduleId, tasks]) => {
        const mod = registry.find((m) => m.id === moduleId);
        return (
          <Card key={moduleId}>
            <h2 className="mb-3 text-lg font-bold">
              {mod?.emoji && <Emoji symbol={`${mod.emoji} `} />}
              {mod ? t(mod.title) : moduleId}
            </h2>
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} studyDay={plan.studyDay} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
