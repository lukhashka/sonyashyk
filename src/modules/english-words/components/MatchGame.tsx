import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, cn } from '@/shared/ui';
import { shuffle, type MatchPair } from '../lib/quiz';
import type { ReviewEntry } from '../lib/queries';

interface Props {
  pairs: MatchPair[];
  onDone: (log: ReviewEntry[]) => void;
}

export function MatchGame({ pairs, onDone }: Props) {
  const { t } = useTranslation('english-words');
  const translations = useMemo(() => shuffle(pairs), [pairs]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [log, setLog] = useState<ReviewEntry[]>([]);
  const allDone = matched.size === pairs.length;

  const pickTerm = (wordId: string) => {
    if (matched.has(wordId)) return;
    setSelected(wordId);
    setWrong(null);
  };

  const pickTranslation = (wordId: string) => {
    if (!selected || matched.has(wordId)) return;
    const correct = selected === wordId;
    setLog((l) => [...l, { wordId: selected, kind: 'match', correct }]);
    if (correct) {
      setMatched((m) => new Set(m).add(wordId));
      setWrong(null);
    } else {
      setWrong(wordId);
    }
    setSelected(null);
  };

  const cell = (state: 'idle' | 'selected' | 'matched' | 'wrong') =>
    cn(
      'min-h-11 w-full rounded-md border px-3 py-2 text-left font-semibold transition-colors',
      state === 'idle' && 'border-border bg-surface-muted hover:bg-primary-soft',
      state === 'selected' && 'border-primary bg-primary-soft',
      state === 'matched' && 'border-success bg-success text-[#3d2c2e] opacity-70',
      state === 'wrong' && 'border-danger bg-danger/20',
    );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">{t('match.title')}</h2>
          <p className="text-sm text-text-muted">{t('match.hint')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ul aria-label={t('match.terms')} className="flex flex-col gap-2">
            {pairs.map((p) => (
              <li key={p.wordId}>
                <button
                  type="button"
                  aria-pressed={selected === p.wordId}
                  disabled={matched.has(p.wordId)}
                  onClick={() => pickTerm(p.wordId)}
                  className={cell(
                    matched.has(p.wordId) ? 'matched' : selected === p.wordId ? 'selected' : 'idle',
                  )}
                >
                  {p.term}
                </button>
              </li>
            ))}
          </ul>
          <ul aria-label={t('match.translations')} className="flex flex-col gap-2">
            {translations.map((p) => (
              <li key={p.wordId}>
                <button
                  type="button"
                  disabled={matched.has(p.wordId)}
                  onClick={() => pickTranslation(p.wordId)}
                  className={cell(
                    matched.has(p.wordId) ? 'matched' : wrong === p.wordId ? 'wrong' : 'idle',
                  )}
                >
                  {p.translation}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {allDone && (
          <p role="status" className="font-semibold">
            {t('match.done')}
          </p>
        )}
      </Card>
      {allDone && (
        <Button onClick={() => onDone(log)} className="self-end">
          {t('match.continue')}
        </Button>
      )}
    </div>
  );
}
