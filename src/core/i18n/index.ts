import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { AppModule } from '@/core/modules/types';
import { uk } from './locales/uk';
import { en } from './locales/en';

export const SUPPORTED_LOCALES = ['uk', 'en'] as const;

void i18n.use(initReactI18next).init({
  resources: { uk, en },
  lng: 'uk',
  fallbackLng: 'uk',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
});

/** Registers each module's translations under its own namespace (= module id). */
export function registerModuleI18n(modules: AppModule[]): void {
  for (const m of modules) {
    if (!m.i18n) continue;
    for (const [lng, bundle] of Object.entries(m.i18n)) {
      i18n.addResourceBundle(lng, m.id, bundle, true, true);
    }
  }
}

export default i18n;
