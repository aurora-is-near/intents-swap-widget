import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('merges conditional classes', () => {
    expect(cn('a', false && 'b', { c: true, d: false }, ['e'])).toBe('a c e');
  });

  it('resolves Tailwind conflicts, the last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
