import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('merges conditional classes', () => {
    expect(cn('a', false && 'b', { c: true, d: false }, ['e'])).toBe('a c e');
  });

  it('resolves Tailwind conflicts, the last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('treats the type-scale tokens as font sizes, not colours', () => {
    expect(cn('text-h64', 'text-ink')).toBe('text-h64 text-ink');
    expect(cn('text-h64', 'text-h44')).toBe('text-h44');
    expect(cn('text-big', 'text-[12px]')).toBe('text-[12px]');
  });
});
