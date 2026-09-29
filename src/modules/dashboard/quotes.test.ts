import { pickQuote } from './quotes';

describe('pickQuote', () => {
  const quotes = ['a', 'b', 'c'];
  it('is stable within a day', () => {
    expect(pickQuote(quotes, '2026-09-29')).toBe(pickQuote(quotes, '2026-09-29'));
  });
  it('rotates between consecutive days', () => {
    expect(pickQuote(quotes, '2026-09-29')).not.toBe(pickQuote(quotes, '2026-09-30'));
  });
  it('handles an empty list', () => {
    expect(pickQuote([], '2026-09-29')).toBe('');
  });
});
