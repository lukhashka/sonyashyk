import { cn } from './cn';

/** Soft pink shimmering placeholder (static for reduced-motion users via the global rule). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-[shimmer_1.6s_linear_infinite] rounded-md bg-primary-soft bg-[linear-gradient(90deg,transparent_0%,var(--color-surface-muted)_50%,transparent_100%)] bg-[length:200%_100%]',
        className,
      )}
    />
  );
}
