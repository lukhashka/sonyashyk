import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUiStore } from '@/core/ui-store';
import { cn } from '@/shared/ui';
import { useNavModules } from './useNavModules';

export function Sidebar() {
  const { t } = useTranslation();
  const { main, more } = useNavModules();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col gap-2 border-r border-border bg-surface-muted p-3 transition-[width] md:flex',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex items-center gap-2 px-2 py-3 font-heading text-xl font-bold">
        <span aria-hidden="true">🌻</span>
        {!collapsed && <span>{t('appName')}</span>}
      </div>
      <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1">
        {[...main, ...more].map((m) => (
          <NavLink
            key={m.id}
            to={`/m/${m.id}`}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-full px-3 font-semibold text-text-muted transition-colors hover:bg-primary-soft',
                isActive && 'bg-primary-soft text-primary-ink',
              )
            }
          >
            <span className="rounded-full bg-primary-soft p-2 text-primary-ink">
              <m.icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            {!collapsed && <span>{t(m.title)}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={toggle}
        aria-label={t('nav.collapse')}
        className="flex min-h-11 items-center justify-center rounded-full text-text-muted hover:bg-primary-soft"
      >
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>
    </aside>
  );
}
