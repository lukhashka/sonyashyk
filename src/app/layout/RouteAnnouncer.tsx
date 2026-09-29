import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { registry } from '@/core/modules/registry';

/**
 * Keeps `<html lang>` and `<title>` in sync with the app and, after a client-side navigation,
 * moves focus to the main region so screen-reader and keyboard users land on the new page.
 */
export function RouteAnnouncer() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const id = pathname.split('/')[2];
    const mod = registry.find((m) => m.id === id);
    document.title = mod ? `${t(mod.title)} · ${t('appName')}` : t('appName');
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname, t]);

  return null;
}
