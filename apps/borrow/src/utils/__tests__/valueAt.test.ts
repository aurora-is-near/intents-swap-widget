import { describe, expect, it } from 'vitest';

import { bigintAt } from '../bigintAt';
import { booleanAt } from '../booleanAt';
import { tupleAt } from '../tupleAt';

const VALUES: readonly unknown[] = [5n, true, [1, 2], 'text', undefined];
const fail = () => new Error('missing');

describe('bigintAt, booleanAt, tupleAt', () => {
  it('return the value at the index when it has the type', () => {
    expect(bigintAt(VALUES, 0, fail)).toBe(5n);
    expect(booleanAt(VALUES, 1, fail)).toBe(true);
    expect(tupleAt(VALUES, 2, fail)).toEqual([1, 2]);
  });

  it.each([
    ['bigintAt', bigintAt],
    ['booleanAt', booleanAt],
    ['tupleAt', tupleAt],
  ] as const)(
    '%s throws fail() for another type or a missing index',
    (_, at) => {
      expect(() => at(VALUES, 3, fail)).toThrow('missing');
      expect(() => at(VALUES, 4, fail)).toThrow('missing');
      expect(() => at(VALUES, 9, fail)).toThrow('missing');
    },
  );
});
