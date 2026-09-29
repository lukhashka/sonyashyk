import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { on } from '@/core/events/bus';
import { useCheckAchievements } from '@/core/stats/queries';
import { getAllAchievements } from './achievements';

const CHECK_DELAY_MS = 800;
const TOAST_MS = 7000;

/**
 * Re-evaluates achievements on the server after progress events (and once on start-up, to catch
 * up), and celebrates newly unlocked ones with a small dismissible toast.
 */
export function AchievementWatcher() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { mutate } = useCheckAchievements();
  const [toasts, setToasts] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const check = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      mutate(undefined, {
        onSuccess: (ids) => {
          if (ids.length > 0) setToasts((prev) => [...prev, ...ids]);
        },
      });
    }, CHECK_DELAY_MS);
  }, [mutate]);

  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) return;
    check();
    const offs = [
      on('task.completed', check),
      on('day.completed', check),
      on('words.learned', check),
    ];
    return () => {
      offs.forEach((off) => off());
      clearTimeout(timer.current);
    };
  }, [signedIn, check]);

  const current = toasts[0];
  const def = current ? getAllAchievements().find((a) => a.id === current) : undefined;

  const dismiss = useCallback(() => setToasts((prev) => prev.slice(1)), []);
  useEffect(() => {
    if (!current) return;
    // Unknown ids (e.g. a module that was disabled) are skipped silently.
    const id = setTimeout(dismiss, def ? TOAST_MS : 0);
    return () => clearTimeout(id);
  }, [current, def, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      <AnimatePresence>
        {def && (
          <motion.div
            key={current}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft"
          >
            <span className="text-3xl" aria-hidden="true">
              {def.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary-ink">{t('achievements.unlocked')}</p>
              <p className="font-heading font-bold">{t(def.title)}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('achievements.dismiss')}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-primary-soft"
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
