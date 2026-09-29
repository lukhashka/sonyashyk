import { addDays, getStudyDay, lastSevenDays } from './studyDay';

describe('getStudyDay', () => {
  it('counts late-night hours for the previous day', () => {
    // 01:30 in Kyiv (UTC+3 in summer) on 2026-07-10
    const now = new Date('2026-07-09T22:30:00Z');
    expect(getStudyDay(now, 'Europe/Kyiv', 4).date).toBe('2026-07-09');
  });

  it('rolls over at the configured hour', () => {
    const now = new Date('2026-07-10T01:00:00Z'); // 04:00 in Kyiv
    expect(getStudyDay(now, 'Europe/Kyiv', 4).date).toBe('2026-07-10');
    expect(getStudyDay(now, 'Europe/Kyiv', 5).date).toBe('2026-07-09');
  });

  it('respects the timezone', () => {
    const now = new Date('2026-07-10T02:00:00Z');
    expect(getStudyDay(now, 'America/New_York', 4).date).toBe('2026-07-09');
    expect(getStudyDay(now, 'Asia/Tokyo', 4).date).toBe('2026-07-10');
  });

  it('crosses month and year boundaries', () => {
    const now = new Date('2026-01-01T00:30:00Z');
    expect(getStudyDay(now, 'UTC', 4).date).toBe('2025-12-31');
  });
});

describe('date helpers', () => {
  it('adds days across months', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('lists the last seven days oldest first', () => {
    const days = lastSevenDays('2026-03-03');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-02-25');
    expect(days[6]).toBe('2026-03-03');
  });
});
