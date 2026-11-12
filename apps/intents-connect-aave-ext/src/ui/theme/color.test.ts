import { describe, expect, it } from 'vitest';

import {
  BLACK,
  contrast,
  deltaE,
  ensureContrast,
  formatColor,
  lightness,
  mix,
  parseColor,
  readableOn,
  toOklab,
  WHITE,
} from './color';

const parse = (value: string) => {
  const color = parseColor(value);

  if (!color) {
    throw new Error(`unparsed: ${value}`);
  }

  return color;
};

describe('parseColor', () => {
  it('reads the forms computed styles and design systems use', () => {
    expect(formatColor(parse('#abc'))).toBe('#aabbcc');
    expect(formatColor(parse('#eb4200'))).toBe('#eb4200');
    expect(formatColor(parse('rgb(235, 66, 0)'))).toBe('#eb4200');
    expect(formatColor(parse('rgb(235 66 0 / 50%)'))).toBe(
      'rgba(235, 66, 0, 0.5)',
    );
    expect(formatColor(parse('rgba(0, 0, 0, 0.06)'))).toBe(
      'rgba(0, 0, 0, 0.06)',
    );
    expect(formatColor(parse('#00000080'))).toBe('rgba(0, 0, 0, 0.502)');
    expect(formatColor(parse('hsl(0 0% 40%)'))).toBe('#666666');
    expect(formatColor(parse('hsl(16, 100%, 46%)'))).toBe('#eb3f00');
    expect(formatColor(parse('white'))).toBe('#ffffff');
    expect(parse('transparent').a).toBe(0);
  });

  it('converts display-p3, as Chrome reports Aave colors, and OKLCH', () => {
    // A gray is the same gray in both spaces.
    expect(
      formatColor(parse('color(display-p3 0.980392 0.980392 0.980392)')),
    ).toBe('#fafafa');
    // The same numbers in P3 are a more saturated red, clamped into sRGB.
    expect(
      deltaE(parse('color(display-p3 0.9215 0.2588 0)'), parse('#eb4200')),
    ).toBeLessThan(0.06);
    expect(parse('color(display-p3 0 0 0 / 0.06)').a).toBeCloseTo(0.06);
    expect(formatColor(parse('color(srgb 1 1 1)'))).toBe('#ffffff');
    expect(formatColor(parse('oklch(0 0 0)'))).toBe('#000000');
    expect(formatColor(parse('oklch(1 0 0)'))).toBe('#ffffff');
  });

  it('refuses what it cannot read', () => {
    ['', 'red', '#ggg', 'rgb(a, b, c)', 'lab(50 0 0)', 'var(--x)'].forEach(
      (value) => expect(parseColor(value)).toBeUndefined(),
    );
  });
});

describe('OKLab and contrast', () => {
  it('round-trips through OKLab', () => {
    const color = parse('#7c5cff');

    expect(deltaE(color, mix(color, color, 0.5))).toBeLessThan(1e-6);
    expect(toOklab(WHITE).L).toBeCloseTo(1, 4);
    expect(toOklab(BLACK).L).toBeCloseTo(0, 4);
  });

  it('mixes in perceptual steps, alpha linearly', () => {
    expect(lightness(mix(BLACK, WHITE, 0.5))).toBeCloseTo(0.5, 2);
    expect(mix(BLACK, { ...BLACK, a: 0 }, 0.25).a).toBeCloseTo(0.75);
  });

  it('measures WCAG contrast, translucent ink over its ground', () => {
    expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 1);
    expect(contrast(parse('#666666'), parse('#fafafa'))).toBeCloseTo(5.5, 1);
    expect(contrast(parse('rgba(0, 0, 0, 0)'), WHITE)).toBeCloseTo(1, 5);
  });

  it('moves a color in lightness until it reads, hue kept', () => {
    const blue = parse('#5b8cff');
    const fixed = ensureContrast(blue, [WHITE], 4.5);

    expect(contrast(fixed, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(lightness(fixed)).toBeLessThan(lightness(blue));
    // Barely past the line, not straight to black.
    expect(contrast(fixed, WHITE)).toBeLessThan(4.7);

    const onDark = ensureContrast(parse('#333333'), [parse('#111111')], 7);

    expect(lightness(onDark)).toBeGreaterThan(lightness(parse('#333333')));
    expect(ensureContrast(blue, [WHITE], 22)).toEqual(BLACK);
  });

  it('picks black or white for text on a color, by WCAG contrast', () => {
    expect(readableOn(parse('#ffd400'))).toEqual(BLACK);
    expect(readableOn(parse('#3b2bb5'))).toEqual(WHITE);
    // A mid-tone: black has the higher WCAG ratio (4.8 vs 4.4).
    expect(readableOn(parse('#7c5cff'))).toEqual(BLACK);
  });
});
