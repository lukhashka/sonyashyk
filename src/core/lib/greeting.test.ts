import { getDayPart } from './greeting';

it('maps hours to day parts', () => {
  expect(getDayPart(5)).toBe('morning');
  expect(getDayPart(12)).toBe('day');
  expect(getDayPart(18)).toBe('evening');
  expect(getDayPart(23)).toBe('night');
  expect(getDayPart(3)).toBe('night');
});
