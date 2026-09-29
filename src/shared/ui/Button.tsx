import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'soft' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-[#3d2c2e] hover:bg-primary-hover shadow-soft',
  soft: 'bg-primary-soft text-primary-ink hover:bg-nude-soft',
  ghost: 'bg-transparent text-primary-ink hover:bg-primary-soft',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-semibold transition-colors disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
