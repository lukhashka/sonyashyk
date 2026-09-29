// Copy this folder to src/modules/<id>/ and adapt. See docs/ADDING_A_MODULE.md.
import { lazy } from 'react';
import { Sparkles } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';

const TemplatePage = lazy(() => import('./pages/TemplatePage'));

export const templateModule: AppModule = {
  id: 'template',
  version: '0.0.0',
  title: 'template:title',
  icon: Sparkles,
  enabledByDefault: false,
  nav: { order: 100, placement: 'more' },
  routes: [{ index: true, element: <TemplatePage /> }],
  i18n: {
    uk: { title: 'Шаблон' },
    en: { title: 'Template' },
  },
};
