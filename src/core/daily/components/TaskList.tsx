import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { registry } from '@/core/modules/registry';
import { Badge, Button, Card, Emoji, Progress } from '@/shared/ui';
import { useReportProgress, type DailyPlan, type DailyTask } from '../queries';

/** Round check: pops with a heart-ish spring when a task becomes done, floating "+XP" above it. */
function TaskCheck({ done, emoji, xp }: { done: boolean; emoji: string; xp: number }) {
  const { t } = useTranslation();
  const [prevDone, setPrevDone] = useState(done);
  const [changed, setChanged] = useState(false);
  if (done !== prevDone) {
    setPrevDone(done);
    setChanged(true);
  }
  const showXp = changed && done;

  useEffect(() => {
    if (!changed) return;
    const id = setTimeout(() => setChanged(false), 1400);
    return () => clearTimeout(id);
  }, [changed, done]);

  return (
    <span className="relative">
      <motion.span
        key={done ? 'done' : 'todo'}
        initial={changed ? { scale: 0.4 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14 }}
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-success text-[#3d2c2e]' : 'bg-primary-soft'
        }`}
      >
        {done ? <Check size={18} aria-hidden="true" /> : <Emoji symbol={emoji} />}
      </motion.span>
      <AnimatePresence>
        {showXp && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -28 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.7 }}
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-sm font-bold whitespace-nowrap text-primary-ink"
          >
            +{t('daily.xp', { count: xp })}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function TaskRow({ task, studyDay }: { task: DailyTask; studyDay: string }) {
  const { t } = useTranslation();
  const report = useReportProgress();
  const done = task.completed_at !== null;
  const title = t(task.title_key);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
      <div className="flex items-center gap-3">
        <TaskCheck done={done} emoji={task.emoji ?? '🌸'} xp={task.xp} />
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
