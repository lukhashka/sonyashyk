import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-ink',
        className,
      )}
      {...rest}
    />
  );
}
