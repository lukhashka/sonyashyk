import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import { i18n as bundles } from '../i18n';
import type { Question } from '../lib/quiz';
import { Flashcards } from './Flashcards';
import { MatchGame } from './MatchGame';
import { Quiz } from './Quiz';
import type { Word } from '../lib/types';

const i18n = createInstance();
void i18n.init({
  lng: 'en',
  ns: ['english-words'],
  defaultNS: 'english-words',
  resources: { en: { 'english-words': bundles.en } },
  interpolation: { escapeValue: false },
});

const wrap = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

const word = (id: string, term: string, uk: string): Word => ({
  id,
  term,
  pos: 'noun',
  ipa: '/x/',
  translation_uk: uk,
  definition_en: `${term} definition`,
  example_en: `An example with ${term}.`,
  topics: [],
  level: 'B2',
  sort_order: 1,
  owner_id: null,
});

describe('Flashcards', () => {
  it('reveals the translation and finishes on the last card', async () => {
    const onDone = vi.fn();
    wrap(
      <Flashcards
        words={[word('1', 'tort', 'делікт'), word('2', 'bail', 'застава')]}
        onDone={onDone}
      />,
    );
    expect(screen.queryByText('делікт')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show translation' }));
    expect(screen.getByText('делікт')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start practice' }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('Quiz', () => {
  const questions: Question[] = [
    {
      kind: 'choose',
      wordId: '1',
      prompt: 'tort',
      answer: 'делікт',
      options: ['делікт', 'застава'],
    },
    { kind: 'type', wordId: '2', prompt: 'застава', answer: 'bail', options: [] },
  ];

  it('logs right and wrong answers and reports them at the end', async () => {
    const onDone = vi.fn();
    wrap(<Quiz questions={questions} onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'застава' })); // wrong
    expect(screen.getByRole('status').textContent).toContain('делікт');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.type(screen.getByLabelText('Your answer'), 'Bail');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onDone).toHaveBeenCalledWith([
      { wordId: '1', kind: 'choose', correct: false },
      { wordId: '2', kind: 'type', correct: true },
    ]);
  });
});

describe('MatchGame', () => {
  it('records a mistake, then completes when every pair is matched', async () => {
    const onDone = vi.fn();
    const pairs = [
      { wordId: '1', term: 'tort', translation: 'делікт' },
      { wordId: '2', term: 'bail', translation: 'застава' },
    ];
    wrap(<MatchGame pairs={pairs} onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'tort' }));
    await userEvent.click(screen.getByRole('button', { name: 'застава' })); // wrong
    await userEvent.click(screen.getByRole('button', { name: 'tort' }));
    await userEvent.click(screen.getByRole('button', { name: 'делікт' }));
    await userEvent.click(screen.getByRole('button', { name: 'bail' }));
    await userEvent.click(screen.getByRole('button', { name: 'застава' }));
    await userEvent.click(screen.getByRole('button', { name: 'See result' }));
    expect(onDone).toHaveBeenCalledWith([
      { wordId: '1', kind: 'match', correct: false },
      { wordId: '1', kind: 'match', correct: true },
      { wordId: '2', kind: 'match', correct: true },
    ]);
  });
});
