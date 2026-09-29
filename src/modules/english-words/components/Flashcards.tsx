import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { canSpeak, speak } from '../lib/speech';
import type { Word } from '../lib/types';

interface Props {
  words: Word[];
  onDone: () => void;
}

export function Flashcards({ words, onDone }: Props) {
  const { t } = useTranslation('english-words');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const word = words[index]!;
  const isLast = index === words.length - 1;

  const go = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted" aria-live="polite">
        {t('card.counter', { current: index + 1, total: words.length })}
      </p>
      <div style={{ perspective: 1000 }}>
        <motion.div
          key={`${index}-${flipped}`}
          initial={{ rotateY: flipped ? -90 : 0 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Card className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
            <p className="font-heading text-3xl font-bold">{word.term}</p>
            <p className="text-text-muted">
              <span className="italic">{word.pos}</span> {word.ipa}
            </p>
            {canSpeak() && (
              <Button
                variant="soft"
                aria-label={t('card.listen', { term: word.term })}
                onClick={() => speak(word.term)}
                className="px-3"
              >
                <Volume2 size={20} aria-hidden="true" />
              </Button>
            )}
            {flipped ? (
              <div className="mt-2 flex flex-col gap-2" data-testid="card-back">
                <p className="text-xl font-semibold text-primary-ink">{word.translation_uk}</p>
                {word.definition_en && (
                  <p>
                    <span className="font-semibold">{t('card.definition')}: </span>
                    {word.definition_en}
                  </p>
                )}
                {word.example_en && (
                  <p className="text-text-muted italic">
                    <span className="font-semibold not-italic">{t('card.example')}: </span>
                    {word.example_en}
                  </p>
                )}
              </div>
            ) : (
              <Button variant="soft" onClick={() => setFlipped(true)} className="mt-2">
                {t('card.show')}
              </Button>
            )}
          </Card>
        </motion.div>
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          {t('card.prev')}
        </Button>
        {isLast ? (
          <Button onClick={onDone}>{t('card.practice')}</Button>
        ) : (
          <Button onClick={() => go(index + 1)}>{t('card.next')}</Button>
        )}
      </div>
    </div>
  );
}
