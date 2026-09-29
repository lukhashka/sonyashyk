import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Card, Emoji } from '@/shared/ui';

/** "Day complete" celebration card (the confetti itself is fired by `CelebrationWatcher`). */
export function DayComplete() {
  const { t } = useTranslation();
  const [pick] = useState(() => Math.random());
  const messages = t('daily.dayMessages', { returnObjects: true });
  const message = Array.isArray(messages)
    ? (messages[Math.floor(pick * messages.length)] as string)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Card role="status" className="bg-[image:var(--gradient-hero)] text-center">
        <motion.p
          className="text-4xl"
          animate={{ rotate: [0, -12, 12, -8, 0] }}
          transition={{ duration: 0.9, delay: 0.2 }}
        >
          <Emoji symbol="🎉" />
        </motion.p>
        <p className="font-heading text-lg font-bold">{t('daily.dayComplete')}</p>
        <p className="text-text-muted">{t('daily.dayCompleteHint')}</p>
        {message && <p className="mt-2 font-semibold text-primary-ink">{message}</p>}
      </Card>
    </motion.div>
  );
}
