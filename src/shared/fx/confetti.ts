import { prefersReducedMotion } from './motion';

const COLORS = ['#e8a0b4', '#fbe4ea', '#e9cbb7', '#c49a82', '#f4b9c9', '#ffffff'];

/**
 * Pink/nude confetti burst. The library is loaded on demand, runs on the main thread (a worker
 * would need a `blob:` CSP source) and is skipped entirely for reduced-motion users.
 */
export async function celebrate(kind: 'day' | 'achievement' = 'day'): Promise<void> {
  if (prefersReducedMotion()) return;
  try {
    const { default: confetti } = await import('canvas-confetti');
    const fire = confetti.create(undefined, { resize: true, useWorker: false });
    const base = { colors: COLORS, zIndex: 60, disableForReducedMotion: true, ticks: 220 };
    if (kind === 'achievement') {
      void fire({ ...base, particleCount: 70, spread: 80, origin: { x: 0.5, y: 0.1 } });
      return;
    }
    void fire({ ...base, particleCount: 90, spread: 70, angle: 60, origin: { x: 0, y: 0.75 } });
    void fire({ ...base, particleCount: 90, spread: 70, angle: 120, origin: { x: 1, y: 0.75 } });
    setTimeout(() => {
      void fire({
        ...base,
        particleCount: 80,
        spread: 100,
        startVelocity: 35,
        origin: { y: 0.55 },
      });
    }, 250);
  } catch {
    /* decoration only — never break the flow */
  }
}
