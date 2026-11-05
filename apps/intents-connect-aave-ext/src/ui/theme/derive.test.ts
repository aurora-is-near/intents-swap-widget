import { describe, expect, it } from 'vitest';

import { contrast, deltaE, parseColor } from './color';
import {
  completeSeed,
  DEFAULT_SEED,
  deriveTokens,
  type ThemeSeed,
} from './derive';
import { resolveTheme } from './resolve';
import { DEFAULT_TOKENS, type ThemeTokens } from './tokens';

const color = (value: string) => {
  const parsed = parseColor(value);

  if (!parsed) {
    throw new Error(`not a color: ${value}`);
  }

  return parsed;
};

const COLOR_TOKENS = (
  Object.keys(DEFAULT_TOKENS) as (keyof ThemeTokens)[]
).filter((key) => parseColor(DEFAULT_TOKENS[key]) !== undefined);

const DARK: ThemeSeed = {
  ...DEFAULT_SEED,
  scheme: 'dark',
  page: '#0b0b0f',
  surface: '#16161d',
  text: '#f5f5f7',
  textSecondary: undefined,
  accent: '#7c5cff',
  accentText: '#ffffff',
  danger: '#ff5c5c',
};

describe('deriveTokens', () => {
  it("reproduces Aave's sampled theme from Aave's seed", () => {
    const derived = deriveTokens(DEFAULT_SEED);

    COLOR_TOKENS.forEach((key) => {
      const want = color(DEFAULT_TOKENS[key]);
      const got = color(derived[key]);

      expect({ key, close: deltaE(got, want) < 0.02 }).toEqual({
        key,
        close: true,
      });
      expect(Math.abs(got.a - want.a)).toBeLessThan(0.01);
    });

    (Object.keys(DEFAULT_TOKENS) as (keyof ThemeTokens)[])
      .filter((key) => !COLOR_TOKENS.includes(key))
      .forEach((key) =>
        expect([key, derived[key]]).toEqual([key, DEFAULT_TOKENS[key]]),
      );
  });

  it('derives a dark theme whose text reads everywhere', () => {
    const tokens = deriveTokens(DARK);
    const grounds = [color(tokens.surface), color(tokens.field)];

    grounds.forEach((ground) => {
      expect(
        contrast(color(tokens.textPrimary), ground),
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrast(color(tokens.textSecondary), ground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color(tokens.textMuted), ground)).toBeGreaterThanOrEqual(
        3,
      );
    });

    // The site's own white on its purple (4.35:1) is kept, from 3:1.
    expect(tokens.ctaText).toBe('#ffffff');
    expect(
      contrast(color(tokens.ctaText), color(tokens.cta)),
    ).toBeGreaterThanOrEqual(3);
    expect(tokens.scheme).toBe('dark');
    // Hairlines are the light text at low alpha; the backdrop is heavier.
    expect(tokens.ring).toMatch(/^rgba\(245, 245, 247, 0\.1\)$/);
    expect(color(tokens.overlay).a).toBeCloseTo(0.6);
    // Hover lifts a dark surface, visibly.
    expect(color(tokens.surfaceHover).r).toBeGreaterThan(
      color(tokens.surface).r,
    );
    expect(
      deltaE(color(tokens.surfaceHover), color(tokens.surface)),
    ).toBeGreaterThan(0.05);
  });

  it('repairs a seed that would not read', () => {
    const tokens = deriveTokens({
      ...DEFAULT_SEED,
      page: '#ffffff',
      text: '#aaaaaa',
      textSecondary: '#dddddd',
      accent: '#ffd400',
      accentText: '#ffffff',
    });

    expect(
      contrast(color(tokens.textPrimary), color('#ffffff')),
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(color(tokens.textSecondary), color('#ffffff')),
    ).toBeGreaterThanOrEqual(4.5);
    // White on yellow doesn't read: black does.
    expect(tokens.ctaText).toBe('#000000');
    // A light CTA darkens on hover.
    expect(color(tokens.ctaHover).r).toBeLessThan(color(tokens.cta).r);
  });

  it('keeps sizes in range, and falls back on colors it cannot read', () => {
    const tokens = deriveTokens({
      ...DEFAULT_SEED,
      fontSize: 20,
      fontWeight: 950,
      controlRadius: 999,
      cardRadius: -4,
      density: 3,
      page: 'not a color',
      font: '  ',
    });

    expect(tokens.textSm).toBe('16px');
    expect(tokens.textAmount).toBe('24px');
    expect(tokens.weightMedium).toBe('700');
    expect(tokens.radiusControl).toBe('24px');
    expect(tokens.radiusCta).toBe('28px');
    expect(tokens.radiusCard).toBe('0px');
    expect(tokens.space).toBe('4.8px');
    expect(tokens.surface).toBe('#fafafa');
    expect(tokens.font).toBe(DEFAULT_TOKENS.font);
  });

  it("follows a site's radius and density", () => {
    const tokens = deriveTokens({
      ...DEFAULT_SEED,
      controlRadius: 4,
      cardRadius: 6,
      density: 0.9,
    });

    expect(tokens).toMatchObject({
      radiusControl: '4px',
      radiusChip: '3px',
      radiusCta: '5px',
      radiusCard: '6px',
      radiusDialog: '6px',
      space: '3.6px',
    });
  });
});

describe('resolveTheme', () => {
  it("is Aave's tokens without a theme", () => {
    expect(resolveTheme()).toEqual(DEFAULT_TOKENS);
  });

  it('derives from a partial seed, and lets exact tokens win', () => {
    const tokens = resolveTheme({
      seed: { accent: '#3b2bb5' },
      tokens: { radiusCta: '0px' },
    });

    expect(tokens.cta).toBe('#3b2bb5');
    // Not Aave's off-white: derived for the new accent.
    expect(tokens.ctaText).toBe('#ffffff');
    expect(tokens.radiusCta).toBe('0px');
    expect(tokens.surface).toBe('#fafafa');
  });

  it("keeps a site's own text on its accent from 3:1", () => {
    const tokens = resolveTheme({
      seed: { accent: '#7c5cff', accentText: '#ffffff' },
    });

    expect(tokens.ctaText).toBe('#ffffff');
  });

  it('completes a seed from the defaults, skipping unset fields', () => {
    expect(completeSeed({ page: '#000000', text: undefined }).text).toBe(
      DEFAULT_SEED.text,
    );
    // A new text color doesn't keep Aave's secondary shade.
    expect(completeSeed({ text: '#222222' }).textSecondary).toBeUndefined();
  });
});
