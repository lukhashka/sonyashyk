import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, cn } from '@/shared/ui';
import { isCorrect, type Question } from '../lib/quiz';
import type { ReviewEntry } from '../lib/queries';

interface Props {
  questions: Question[];
  onDone: (log: ReviewEntry[]) => void;
}

type Feedback = { correct: boolean; chosen: string } | null;

export function Quiz({ questions, onDone }: Props) {
  const { t } = useTranslation('english-words');
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<ReviewEntry[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [typed, setTyped] = useState('');
  const q = questions[index]!;
  const isLast = index === questions.length - 1;

  const answer = (value: string) => {
    if (feedback) return;
    const correct = isCorrect(q, value);
    setFeedback({ correct, chosen: value });
    setLog((l) => [...l, { wordId: q.wordId, kind: q.kind, correct }]);
  };

  const next = () => {
    if (isLast) {
      onDone(log);
      return;
    }
    setIndex(index + 1);
    setFeedback(null);
    setTyped('');
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    if (typed.trim()) answer(typed);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted" aria-live="polite">
        {t('quiz.counter', { current: index + 1, total: questions.length })}
      </p>
      <Card className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-text-muted">{t(`quiz.${q.kind}`)}</p>
        <p className="font-heading text-2xl font-bold" data-testid="prompt">
          {q.prompt}
        </p>

        {q.kind === 'type' ? (
          <form onSubmit={submitTyped} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              {t('quiz.answerLabel')}
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={feedback !== null}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base font-normal"
              />
            </label>
            {!feedback && <Button type="submit">{t('quiz.check')}</Button>}
          </form>
        ) : (
          <ul className="flex flex-col gap-2">
            {q.options.map((option) => {
              const chosen = feedback?.chosen === option;
              const isAnswer = option === q.answer;
              return (
                <li key={option}>
                  <button
                    type="button"
                    disabled={feedback !== null}
                    onClick={() => answer(option)}
                    className={cn(
                      'min-h-11 w-full rounded-md border px-4 py-2 text-left font-semibold transition-colors',
                      !feedback && 'border-border bg-surface-muted hover:bg-primary-soft',
                      feedback && isAnswer && 'border-success bg-success text-[#3d2c2e]',
                      feedback && chosen && !isAnswer && 'border-danger bg-danger/20',
                      feedback && !chosen && !isAnswer && 'border-border opacity-60',
                    )}
                  >
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {feedback && (
          <p
            role="status"
            className={feedback.correct ? 'font-semibold' : 'font-semibold text-danger'}
          >
            {feedback.correct ? t('quiz.right') : t('quiz.wrong', { answer: q.answer })}
          </p>
        )}
      </Card>
      {feedback && (
        <Button onClick={next} className="self-end">
          {isLast ? t('quiz.finish') : t('quiz.continue')}
        </Button>
      )}
    </div>
  );
}
