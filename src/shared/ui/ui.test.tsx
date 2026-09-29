import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';
import { Emoji } from './Emoji';

it('Progress exposes accessible values and clamps', () => {
  render(<Progress value={15} max={10} label="Слова" />);
  const bar = screen.getByRole('progressbar', { name: 'Слова' });
  expect(bar).toHaveAttribute('aria-valuenow', '15');
  expect((bar.firstChild as HTMLElement).style.width).toBe('100%');
});

it('Emoji is labelled when a label is given', () => {
  render(<Emoji symbol="🔥" label="серія" />);
  expect(screen.getByRole('img', { name: 'серія' })).toBeInTheDocument();
});
