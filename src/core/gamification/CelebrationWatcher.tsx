import { useEffect } from 'react';
import { on } from '@/core/events/bus';
import { celebrate } from '@/shared/fx';

/** Confetti when the whole daily set is completed. */
export function CelebrationWatcher() {
  useEffect(() => on('day.completed', () => void celebrate('day')), []);
  return null;
}
