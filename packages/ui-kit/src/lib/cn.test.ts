import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { cn } from './cn';

/** The font-size names theme.css gives Tailwind (`--text-h64` → `h64`). */
const TYPE_SCALE = [
  ...readFileSync(
    fileURLToPath(new URL('../styles/theme.css', import.meta.url)),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/--text-([a-z0-9]+(?:-[a-z0-9]+)*)\s*:/g),
].map(([, name]) => name);

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

  // Guards the parsing, so the check below cannot pass on an empty list.
  it('reads the type scale from theme.css', () => {
    expect(TYPE_SCALE).toEqual(
      expect.arrayContaining(['h64', 'h56', 'h44', 'big']),
    );
  });

  it.each(TYPE_SCALE)('knows text-%s from theme.css is a font size', (name) => {
    expect(cn(`text-${name}`, 'text-ink')).toBe(`text-${name} text-ink`);
    expect(cn(`text-${name}`, 'text-[12px]')).toBe('text-[12px]');
  });
});
