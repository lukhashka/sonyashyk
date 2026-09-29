import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BookOpen, Minus, Plus, Repeat } from 'lucide-react';
import { useDailyPlan, useStudyDay } from '@/core/daily/queries';
import { Badge, Button, Card, EmptyState, Progress, Skeleton } from '@/shared/ui';
import { useDictionary, useUserWords, useWordsPerDay } from '../lib/queries';
import {
  MAX_REVIEW_BATCH,
  MAX_WORDS_PER_DAY,
  MIN_WORDS_PER_DAY,
  pickDueWords,
  pickNewWords,
} from '../lib/selection';

const linkButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-semibold transition-colors';

export default function HubPage() {
  const { t } = useTranslation('english-words');
  const words = useDictionary();
  const userWords = useUserWords();
  const perDay = useWordsPerDay();
  const plan = useDailyPlan();
  const today = useStudyDay();

  if (words.isError || userWords.isError) {
    return <EmptyState emoji="🌧️" title={t('hub.error')} />;
  }
  if (!words.data || !userWords.data || !today) return <Skeleton className="h-64 w-full" />;

  const newCount = Math.min(
    perDay.value,
    pickNewWords(words.data, userWords.data, perDay.value).length,
  );
  const dueCount = pickDueWords(words.data, userWords.data, today, MAX_REVIEW_BATCH).length;
  const learnTask = plan.data?.tasks.find(
    (x) => x.module_id === 'english-words' && x.task_key === 'words-learn',
  );
  const learnDone = Boolean(learnTask?.completed_at);
  const count = (s: string) => userWords.data.filter((u) => u.status === s).length;
  const known = count('known');
  const learning = count('learning');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">{t('hub.heading')}</h1>
        <p className="text-text-muted">{t('hub.subtitle')}</p>
      </header>

      <Card className="flex flex-col gap-4 bg-[image:var(--gradient-hero)]">
        <h2 className="text-lg font-bold">{t('hub.today')}</h2>
        {learnTask && (
          <div className="flex flex-col gap-1">
            <Progress
              value={learnTask.progress}
              max={learnTask.target}
              label={t('hub.progress', { done: learnTask.progress, target: learnTask.target })}
            />
            <p className="text-sm text-text-muted">
              {t('hub.progress', { done: learnTask.progress, target: learnTask.target })}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {newCount > 0 ? (
            <Link
              to="/m/english-words/session?mode=learn"
              className={`${linkButton} bg-primary text-[#3d2c2e] shadow-soft hover:bg-primary-hover`}
            >
              <BookOpen size={18} aria-hidden="true" />
              {t(learnDone ? 'hub.learnMore' : 'hub.learnCta', { count: newCount })}
            </Link>
          ) : (
            <p className="text-text-muted">{t('hub.noNew')}</p>
          )}
          {dueCount > 0 && (
            <Link
              to="/m/english-words/session?mode=review"
              className={`${linkButton} bg-primary-soft text-primary-ink hover:bg-nude-soft`}
            >
              <Repeat size={18} aria-hidden="true" />
              {t('hub.reviewCta', { count: dueCount })}
            </Link>
          )}
        </div>
        {learnDone && <p className="font-semibold text-primary-ink">{t('hub.learnDone')}</p>}
        {dueCount === 0 && <p className="text-sm text-text-muted">{t('hub.reviewNone')}</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t('hub.stats')}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>
            {t('hub.statNew')}: {words.data.length - userWords.data.length}
          </Badge>
          <Badge>
            {t('hub.statLearning')}: {learning}
          </Badge>
          <Badge>
            {t('hub.statKnown')}: {known}
          </Badge>
          <Badge>
            {t('hub.statTotal')}: {words.data.length}
          </Badge>
        </div>
        <Progress value={known} max={words.data.length} label={t('hub.statKnown')} />
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{t('hub.perDay')}</p>
          <p className="text-sm text-text-muted">{t('hub.perDayHint')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="soft"
            aria-label={t('hub.decrease')}
            disabled={perDay.value <= MIN_WORDS_PER_DAY || perDay.save.isPending}
            onClick={() => perDay.save.mutate(perDay.value - 1)}
            className="px-3"
          >
            <Minus size={18} aria-hidden="true" />
          </Button>
          <output aria-live="polite" className="w-8 text-center text-xl font-bold">
            {perDay.value}
          </output>
          <Button
            variant="soft"
            aria-label={t('hub.increase')}
            disabled={perDay.value >= MAX_WORDS_PER_DAY || perDay.save.isPending}
            onClick={() => perDay.save.mutate(perDay.value + 1)}
            className="px-3"
          >
            <Plus size={18} aria-hidden="true" />
          </Button>
        </div>
      </Card>

      <Link
        to="/m/english-words/dictionary"
        className={`${linkButton} self-start bg-primary-soft text-primary-ink hover:bg-nude-soft`}
      >
        {t('hub.dictionary')}
      </Link>
    </div>
  );
}
