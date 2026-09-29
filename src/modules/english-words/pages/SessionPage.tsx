import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useDailyPlan, useReportProgress, useStudyDay } from '@/core/daily/queries';
import { emit } from '@/core/events/bus';
import { Button, Card, EmptyState, Skeleton } from '@/shared/ui';
import { Flashcards } from '../components/Flashcards';
import { MatchGame } from '../components/MatchGame';
import { Quiz } from '../components/Quiz';
import { Result } from '../components/Result';
import {
  useDictionary,
  useSaveSession,
  useUserWords,
  useWordsPerDay,
  type ReviewEntry,
  type SessionOutcome,
} from '../lib/queries';
import { buildMatchPairs, buildQuestions } from '../lib/quiz';
import { buildOutcomes } from '../lib/session';
import { pickDueWords, pickNewWords } from '../lib/selection';
import type { UserWord, Word } from '../lib/types';

type Mode = 'learn' | 'review';
type Phase = 'learn' | 'practice' | 'match' | 'result';

const taskKeyFor = (mode: Mode) => (mode === 'learn' ? 'words-learn' : 'words-review');

interface SessionProps {
  mode: Mode;
  words: Word[];
  pool: Word[];
  userWords: UserWord[];
  today: string;
}

function Session({ mode, words, pool, userWords, today }: SessionProps) {
  const { t } = useTranslation('english-words');
  const [phase, setPhase] = useState<Phase>(mode === 'learn' ? 'learn' : 'practice');
  // Built once: the session must not reshuffle when queries refetch after saving.
  const [questions] = useState(() => buildQuestions(words, pool));
  const [pairs] = useState(() => (words.length >= 3 ? buildMatchPairs(words) : []));
  const [practiceLog, setPracticeLog] = useState<ReviewEntry[]>([]);
  const [result, setResult] = useState<{ outcomes: SessionOutcome[]; log: ReviewEntry[] } | null>(
    null,
  );

  const save = useSaveSession();
  const report = useReportProgress();
  const plan = useDailyPlan();

  const persist = useCallback(
    async (payload: { outcomes: SessionOutcome[]; log: ReviewEntry[] }) => {
      await save.mutateAsync(payload);
      const task = plan.data?.tasks.find(
        (x) => x.module_id === 'english-words' && x.task_key === taskKeyFor(mode),
      );
      if (task && plan.data) {
        report.mutate({ task, progress: words.length, studyDay: plan.data.studyDay });
      }
      if (mode === 'learn') emit('words.learned', { count: words.length });
    },
    [save, plan.data, report, mode, words.length],
  );

  const finish = (log: ReviewEntry[]) => {
    const payload = { outcomes: buildOutcomes(words, userWords, log, today), log };
    setResult(payload);
    setPhase('result');
    persist(payload).catch(() => undefined); // failure is surfaced through save.isError
  };

  const steps: { id: Phase; label: string }[] = [
    ...(mode === 'learn' ? [{ id: 'learn' as const, label: t('session.phaseLearn') }] : []),
    { id: 'practice', label: t('session.phasePractice') },
    ...(pairs.length > 0 ? [{ id: 'match' as const, label: t('session.phaseMatch') }] : []),
    { id: 'result', label: t('session.phaseResult') },
  ];
  const stepIndex = steps.findIndex((s) => s.id === phase);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          {t(mode === 'learn' ? 'session.learnTitle' : 'session.reviewTitle')}
        </h1>
        <p className="text-sm text-text-muted">
          {t('session.step', { current: stepIndex + 1, total: steps.length })} ·{' '}
          {steps[stepIndex]?.label}
        </p>
      </header>

      {phase === 'learn' && <Flashcards words={words} onDone={() => setPhase('practice')} />}
      {phase === 'practice' && (
        <Quiz
          questions={questions}
          onDone={(log) => {
            setPracticeLog(log);
            if (pairs.length > 0) setPhase('match');
            else finish(log);
          }}
        />
      )}
      {phase === 'match' && (
        <MatchGame pairs={pairs} onDone={(matchLog) => finish([...practiceLog, ...matchLog])} />
      )}
      {phase === 'result' && result && (
        <Result
          words={words}
          outcomes={result.outcomes}
          log={result.log}
          saving={save.isPending}
          saveFailed={save.isError}
          onRetry={() => persist(result).catch(() => undefined)}
        />
      )}
    </div>
  );
}

export default function SessionPage() {
  const { t } = useTranslation('english-words');
  const [params] = useSearchParams();
  const mode: Mode = params.get('mode') === 'review' ? 'review' : 'learn';
  const dictionary = useDictionary();
  const userWords = useUserWords();
  const perDay = useWordsPerDay();
  const today = useStudyDay();

  if (dictionary.isError || userWords.isError) {
    return <EmptyState emoji="🌧️" title={t('hub.error')} />;
  }
  if (!dictionary.data || !userWords.data || perDay.isPending || !today) {
    return <Skeleton className="h-64 w-full" />;
  }
  return (
    <SessionLoader
      key={mode}
      mode={mode}
      dictionary={dictionary.data}
      userWords={userWords.data}
      perDay={perDay.value}
      today={today}
    />
  );
}

interface LoaderProps {
  mode: Mode;
  dictionary: Word[];
  userWords: UserWord[];
  perDay: number;
  today: string;
}

/** Picks the session's words exactly once, so saving results cannot swap them mid-screen. */
function SessionLoader({ mode, dictionary, userWords, perDay, today }: LoaderProps) {
  const { t } = useTranslation('english-words');
  const [words] = useState(() =>
    mode === 'learn'
      ? pickNewWords(dictionary, userWords, perDay)
      : pickDueWords(dictionary, userWords, today),
  );

  if (words.length === 0) {
    return (
      <Card>
        <EmptyState emoji="🌸" title={t('session.nothing')}>
          <Link to="/m/english-words">
            <Button variant="soft">{t('session.back')}</Button>
          </Link>
        </EmptyState>
      </Card>
    );
  }
  return (
    <Session mode={mode} words={words} pool={dictionary} userWords={userWords} today={today} />
  );
}
