import { lazy } from 'react';
import { NotebookPen } from 'lucide-react';
import type { AppModule } from '@/core/modules/types';
import { i18n } from './i18n';
import { fetchNoteStats } from './lib/fetchers';

const NotesPage = lazy(() => import('./pages/NotesPage'));
const NoteEditorPage = lazy(() => import('./pages/NoteEditorPage'));

export const notesModule: AppModule = {
  id: 'notes',
  version: '0.1.0',
  title: 'notes:title',
  icon: NotebookPen,
  emoji: '📝',
  enabledByDefault: true,
  nav: { order: 4, placement: 'more' },
  routes: [
    { index: true, element: <NotesPage /> },
    { path: ':id', element: <NoteEditorPage /> },
  ],
  statsProvider: {
    async getSummary(range) {
      const s = await fetchNoteStats(range);
      return [
        { key: 'total', label: 'notes:stats.total', value: s.total, emoji: '📝' },
        { key: 'written', label: 'notes:stats.written', value: s.written, emoji: '✍️' },
      ];
    },
  },
  i18n,
};
