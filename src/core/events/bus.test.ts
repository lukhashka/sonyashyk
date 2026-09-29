import { emit, on } from './bus';

describe('event bus', () => {
  it('delivers payloads and supports unsubscribe', () => {
    const seen: number[] = [];
    const off = on('xp.awarded', ({ amount }) => seen.push(amount));
    emit('xp.awarded', { amount: 5 });
    off();
    emit('xp.awarded', { amount: 7 });
    expect(seen).toEqual([5]);
  });

  it('isolates a failing handler', () => {
    const seen: number[] = [];
    const a = on('words.learned', () => {
      throw new Error('boom');
    });
    const b = on('words.learned', ({ count }) => seen.push(count));
    emit('words.learned', { count: 3 });
    a();
    b();
    expect(seen).toEqual([3]);
  });
});
