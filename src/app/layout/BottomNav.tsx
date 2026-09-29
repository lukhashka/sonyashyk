import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import { Ellipsis } from 'lucide-react';
import { cn } from '@/shared/ui';
import { useNavModules } from './useNavModules';

const tabBase =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-text-muted';

export function BottomNav() {
  const { t } = useTranslation();
  const { main, more } = useNavModules();

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {main.map((m) => (
        <NavLink
          key={m.id}
          to={`/m/${m.id}`}
          className={({ isActive }) => cn(tabBase, isActive && 'text-primary-ink')}
        >
          <m.icon size={22} strokeWidth={1.75} aria-hidden="true" />
          <span>{t(m.title)}</span>
        </NavLink>
      ))}
      {more.length > 0 && (
        <Dialog.Root>
          <Dialog.Trigger className={tabBase}>
            <Ellipsis size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>{t('nav.more')}</span>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-30 bg-black/30" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-40 rounded-t-lg bg-surface p-5 pb-8">
              <Dialog.Title className="mb-3 font-heading text-lg font-bold">
                {t('nav.menu')}
              </Dialog.Title>
              <Dialog.Description className="sr-only">{t('nav.menu')}</Dialog.Description>
              <ul className="grid gap-1">
                {more.map((m) => (
                  <li key={m.id}>
                    <Dialog.Close asChild>
                      <NavLink
                        to={`/m/${m.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-full px-3 font-semibold hover:bg-primary-soft"
                      >
                        <m.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                        {t(m.title)}
                      </NavLink>
                    </Dialog.Close>
                  </li>
                ))}
              </ul>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </nav>
  );
}
