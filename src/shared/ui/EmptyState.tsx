import type { ReactNode } from 'react';
import { Emoji } from './Emoji';

interface Props {
  emoji?: string;
  title: string;
  children?: ReactNode;
}

export function EmptyState({ emoji = '🌸', title, children }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="text-5xl">
        <Emoji symbol={emoji} />
      </span>
      <p className="font-heading text-lg font-bold">{title}</p>
      {children && <div className="text-text-muted">{children}</div>}
    </div>
  );
}
