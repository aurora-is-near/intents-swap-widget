// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { cn } from '../cn';

const THEME_CSS = readFileSync(
  fileURLToPath(new URL('../../styles/theme.css', import.meta.url)),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

/** The names theme.css gives a namespace (`--text-h64` → `h64`). */
const tokens = (namespace: string) =>
  [
    ...THEME_CSS.matchAll(
      new RegExp(
        `--${namespace}-([a-z0-9\\\\.]+(?:-[a-z0-9\\\\.]+)*)\\s*:`,
        'g',
      ),
    ),
  ].map(([, name = '']) => name.replace(/\\/g, ''));

const TYPE_SCALE = tokens('text');

describe('cn', () => {
  it('merges conditional classes', () => {
    expect(cn('a', false && 'b', { c: true, d: false }, ['e'])).toBe('a c e');
  });

  it('resolves Tailwind conflicts, the last one wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('treats the type-scale tokens as font sizes, not colours', () => {
    expect(cn('text-h64', 'text-ink')).toBe('text-h64 text-ink');
    expect(cn('text-h64', 'text-12')).toBe('text-12');
  });

  // Guards the parsing, so the check below cannot pass on an empty list.
  it('reads the type scale from theme.css', () => {
    expect(TYPE_SCALE).toEqual(expect.arrayContaining(['h64', '14']));
  });

  it.each(TYPE_SCALE)('knows text-%s from theme.css is a font size', (name) => {
    expect(cn(`text-${name}`, 'text-ink')).toBe(`text-${name} text-ink`);
    expect(cn(`text-${name}`, 'text-12')).toBe('text-12');
  });

  it('reads the other scales from theme.css', () => {
    expect(tokens('radius')).toContain('18');
    expect(tokens('leading')).toContain('1.02');
    expect(tokens('tracking')).toContain('label');
    expect(tokens('shadow')).toContain('popup');
  });

  it.each(tokens('radius'))('knows rounded-%s is a radius', (name) => {
    expect(cn(`rounded-${name}`, 'rounded-full')).toBe('rounded-full');
  });

  it.each(tokens('leading'))('knows leading-%s is a line height', (name) => {
    expect(cn(`leading-${name}`, 'leading-none')).toBe('leading-none');
  });

  it.each(tokens('tracking'))('knows tracking-%s is letter spacing', (name) => {
    expect(cn(`tracking-${name}`, 'tracking-wide')).toBe('tracking-wide');
  });

  it.each(tokens('shadow'))('knows shadow-%s is a shadow', (name) => {
    expect(cn(`shadow-${name}`, 'shadow-none')).toBe('shadow-none');
    expect(cn(`shadow-${name}`, 'text-ink')).toBe(`shadow-${name} text-ink`);
  });

  it.each(tokens('animate'))('knows animate-%s is an animation', (name) => {
    expect(cn(`animate-${name}`, 'animate-none')).toBe('animate-none');
  });
});
