import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { Badge, Button, Card, Emoji } from '@/shared/ui';
import { useMarkKnown, type ReviewEntry, type SessionOutcome } from '../lib/queries';
import { accuracy, countMistakes } from '../lib/session';
import type { Word } from '../lib/types';

interface Props {
  words: Word[];
  outcomes: SessionOutcome[];
  log: ReviewEntry[];
  saving: boolean;
  saveFailed: boolean;
  onRetry: () => void;
}

export function Result({ words, outcomes, log, saving, saveFailed, onRetry }: Props) {
  const { t } = useTranslation('english-words');
  const markKnown = useMarkKnown();
  const [known, setKnown] = useState<Set<string>>(new Set());
  const score = accuracy(log);
  const mistakes = countMistakes(log);
  const missed = words.filter((w) => mistakes.has(w.id));
  const outcomeOf = new Map(outcomes.map((o) => [o.wordId, o.srs]));

  const setAsKnown = (word: Word) => {
    const srs = outcomeOf.get(word.id);
    if (!srs) return;
    markKnown.mutate(
      { wordId: word.id, current: { word_id: word.id, ...srs } },
      { onSuccess: () => setKnown((k) => new Set(k).add(word.id)) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 bg-[image:var(--gradient-hero)] text-center">
        <span className="text-5xl">
          <Emoji symbol={score >= 80 ? '🌻' : score >= 50 ? '🌸' : '🌱'} />
        </span>
        <h2 className="text-2xl font-bold">{t('result.title')}</h2>
        <p className="text-xl font-semibold text-primary-ink">
          {t('result.score', { value: score })}
        </p>
        <p className="text-text-muted">{t('result.words', { count: words.length })}</p>
        <p>
          {score >= 80 ? t('result.great') : score >= 50 ? t('result.ok') : t('result.tryAgain')}
        </p>
        {saving && <p className="text-sm text-text-muted">{t('result.saving')}</p>}
        {saveFailed && (
          <div role="alert" className="flex flex-col items-center gap-2">
            <p className="text-danger">{t('result.saveError')}</p>
            <Button variant="soft" onClick={onRetry}>
              {t('result.retry')}
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-2">
        <h3 className="font-bold">{t('result.mistakes')}</h3>
        {missed.length === 0 ? (
          <p className="text-text-muted">{t('result.noMistakes')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {missed.map((w) => (
              <li key={w.id}>
                <span className="font-semibold">{w.term}</span> — {w.translation_uk}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {words.map((w) => {
            const srs = outcomeOf.get(w.id);
            const isKnown = known.has(w.id) || srs?.status === 'known';
            return (
              <li
                key={w.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-muted p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.term}</p>
                  <p className="text-sm text-text-muted">
                    {w.translation_uk}
                    {srs && ` · ${t('result.next', { date: srs.due_on })}`}
                  </p>
                </div>
                {isKnown ? (
                  <Badge>
                    <Check size={14} aria-hidden="true" /> {t('result.known')}
                  </Badge>
                ) : (
                  <>
                    <Badge>{t('result.learning')}</Badge>
                    <Button
                      variant="ghost"
                      disabled={saving || saveFailed || markKnown.isPending}
                      onClick={() => setAsKnown(w)}
                    >
                      {t('result.markKnown')}
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link
          to="/m/english-words/dictionary"
          className="inline-flex min-h-11 items-center rounded-full bg-primary-soft px-5 font-semibold text-primary-ink"
        >
          {t('result.toDictionary')}
        </Link>
        <Link
          to="/m/english-words"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-[#3d2c2e] shadow-soft"
        >
          {t('result.done')}
        </Link>
      </div>
    </div>
  );
}
