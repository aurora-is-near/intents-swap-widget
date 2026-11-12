import { describe, expect, it } from 'vitest';

import { formatWhen } from './amounts';

/** Local times, as the user sees them. */
const at = (...parts: [number, number, number, number, number]) =>
  new Date(...parts).toISOString();

describe('formatWhen', () => {
  const now = new Date(2026, 10, 6, 18, 0);

  it('says today and yesterday, else the day', () => {
    expect(formatWhen(at(2026, 10, 6, 14, 32), now)).toBe('Today, 14:32');
    expect(formatWhen(at(2026, 10, 5, 9, 10), now)).toBe('Yesterday, 09:10');
    expect(formatWhen(at(2026, 10, 3, 14, 32), now)).toBe('3 Nov, 14:32');
  });

  it('adds the year when it is not this one', () => {
    expect(formatWhen(at(2025, 11, 31, 23, 5), now)).toBe('31 Dec 2025, 23:05');
  });

  it('is empty for a time that does not parse', () => {
    expect(formatWhen(undefined, now)).toBe('');
    expect(formatWhen('not a date', now)).toBe('');
  });
});
