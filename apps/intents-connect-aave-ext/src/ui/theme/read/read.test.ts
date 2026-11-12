import { describe, expect, it } from 'vitest';

import { BLACK, parseColor, type Rgba, WHITE } from '../color';
import { pageHints, resolveTheme } from '../resolve';
import { DEFAULT_TOKENS } from '../tokens';
import { readDesignSystem } from './designSystems';
import {
  type ButtonSample,
  cardSurface,
  controlShape,
  paintedIn,
  pickAccent,
} from './heuristics';

const color = (value: string) => parseColor(value) as Rgba;

/** app.aave.com's MUI variables, as Chrome reports them (P3 + channels). */
const AAVE_VARS: Record<string, string> = {
  '--mui-palette-primary-main': 'color(display-p3 0 0 0)',
  '--mui-palette-primary-mainChannel': '0 0 0',
  '--mui-palette-primary-contrastText': 'color(display-p3 0.98 0.98 0.98)',
  '--mui-palette-primary-contrastTextChannel': '250 250 250',
  '--mui-palette-background-default': 'color(display-p3 0.945 0.945 0.945)',
  '--mui-palette-background-defaultChannel': '241 241 241',
  '--mui-palette-background-paper': 'color(display-p3 1 1 1)',
  '--mui-palette-background-paperChannel': '255 255 255',
  '--mui-palette-text-primary': 'color(display-p3 0 0 0)',
  '--mui-palette-text-primaryChannel': '0 0 0',
  '--mui-palette-text-secondary': 'color(display-p3 0.4 0.4 0.4)',
  '--mui-palette-text-secondaryChannel': '102 102 102',
  '--mui-palette-error-main': 'color(display-p3 0.9216 0.2588 0)',
  '--mui-palette-error-mainChannel': '235 66 0',
};

const reader = (vars: Record<string, string>) => (name: string) =>
  vars[name] ?? '';

const button = (overrides: Partial<ButtonSample>): ButtonSample => ({
  text: WHITE,
  radius: 8,
  height: 36,
  width: 120,
  weight: 500,
  boxed: true,
  primaryish: false,
  hinted: false,
  ...overrides,
});

describe('readDesignSystem', () => {
  it("reads MUI's palette, preferring the exact sRGB channels", () => {
    expect(readDesignSystem(reader(AAVE_VARS))).toEqual({
      id: 'mui',
      values: {
        page: '#f1f1f1',
        surface: '#ffffff',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#000000',
        accentText: '#fafafa',
        danger: '#eb4200',
      },
    });
  });

  it("reads shadcn's bare HSL triples", () => {
    const system = readDesignSystem(
      reader({
        '--primary-foreground': '0 0% 100%',
        '--primary': '262 83% 58%',
        '--background': '240 10% 3.9%',
        '--foreground': '0 0% 98%',
        '--card': '240 10% 6%',
        '--destructive': 'oklch(0.63 0.21 25)',
      }),
    );

    expect(system?.id).toBe('shadcn');
    expect(system?.values).toMatchObject({
      accentText: '#ffffff',
      page: '#09090b',
      text: '#fafafa',
    });
    expect(system?.values.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(system?.values.danger).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('reads Bootstrap, and finds nothing on a page without a known system', () => {
    expect(
      readDesignSystem(
        reader({ '--bs-primary': '#0d6efd', '--bs-body-bg': '#fff' }),
      ),
    ).toEqual({
      id: 'bootstrap',
      values: { accent: '#0d6efd', page: '#ffffff' },
    });
    expect(readDesignSystem(reader({ '--other': '#123456' }))).toBeUndefined();
  });
});

describe('pickAccent', () => {
  const page = color('#fafafa');
  const surface = WHITE;

  it('takes the filled button with the most weight, not the page-colored ones', () => {
    const accent = pickAccent(
      [
        button({ fill: WHITE, text: BLACK }),
        button({ fill: WHITE, text: BLACK }),
        button({ fill: WHITE, text: BLACK }),
        button({ fill: color('#2563eb'), primaryish: true }),
        button({ fill: color('#2563eb') }),
        button({ fill: color('#64748b') }),
      ],
      [page, surface],
    );

    expect(accent).toEqual({ fill: color('#2563eb'), count: 2 });
  });

  it("lets the site adapter's selector win, and a neutral primary count", () => {
    expect(
      pickAccent(
        [
          button({ fill: color('#2563eb'), primaryish: true }),
          button({ fill: BLACK, hinted: true }),
        ],
        [page],
      )?.fill,
    ).toEqual(BLACK);
    expect(pickAccent([button({ fill: BLACK })], [page])?.fill).toEqual(BLACK);
  });

  it('finds none among text buttons', () => {
    expect(
      pickAccent([button({ fill: undefined }), button({ fill: page })], [page]),
    ).toBeUndefined();
  });
});

describe('paintedIn', () => {
  it("reads how the page writes on an accent it didn't pick", () => {
    // Bootstrap names its primary, not the white on it.
    const blue = color('#0d6efd');

    expect(
      paintedIn(
        [
          button({ fill: WHITE, text: blue }),
          button({ fill: color('#0d6efe'), text: WHITE, weight: 400 }),
          button({ fill: blue, text: WHITE, weight: 400 }),
        ],
        blue,
      ),
    ).toEqual({ text: WHITE, weight: 400, count: 2 });
    expect(paintedIn([button({ fill: WHITE })], blue)).toBeUndefined();
  });
});

describe('controlShape', () => {
  it('takes the median radius of real buttons', () => {
    expect(
      controlShape([
        button({ radius: 8, height: 36 }),
        button({ radius: 8, height: 40 }),
        button({ radius: 12, height: 44 }),
        // An icon button and a text link don't count.
        button({ radius: 7, height: 14, width: 14 }),
        button({ radius: 0, height: 20, boxed: false }),
      ]),
    ).toEqual({ radius: 8, count: 3 });
  });

  it('calls a page of pills round', () => {
    expect(
      controlShape([
        button({ radius: 20, height: 40 }),
        button({ radius: 22, height: 44 }),
      ])?.radius,
    ).toBe(999);
  });
});

describe('cardSurface', () => {
  it('takes the fill covering the most area, and its radius', () => {
    expect(
      cardSurface(
        [
          { fill: WHITE, radius: 10, area: 90_000 },
          { fill: WHITE, radius: 12, area: 60_000 },
          { fill: WHITE, radius: 10, area: 40_000 },
          { fill: color('#ffe4e6'), radius: 4, area: 20_000 },
          // The page's own color isn't a card.
          { fill: color('#fafafa'), radius: 8, area: 500_000 },
        ],
        color('#fafafa'),
      ),
    ).toEqual({ fill: WHITE, radius: 10, count: 3 });
  });
});

describe('resolveTheme with the page', () => {
  it("is Aave's tokens when the page reads like Aave", () => {
    const tokens = resolveTheme(
      {},
      {
        page: '#fafafa',
        surface: '#ffffff',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#000000',
        accentText: '#fafafa',
        danger: '#eb4200',
        controlRadius: 8,
        cardRadius: 12,
        density: 1,
        fontSize: 14,
        fontWeight: 500,
      },
    );

    expect(tokens.cta).toBe(DEFAULT_TOKENS.cta);
    expect(tokens.surface).toBe(DEFAULT_TOKENS.surface);
    expect(tokens.radiusControl).toBe(DEFAULT_TOKENS.radiusControl);
  });

  it("puts the theme's seed over the page's, and exact tokens over both", () => {
    const tokens = resolveTheme(
      { seed: { accent: '#2563eb' }, tokens: { radiusCard: '0px' } },
      { accent: '#000000', accentText: '#fafafa', controlRadius: 4 },
    );

    expect(tokens.cta).toBe('#2563eb');
    expect(tokens.radiusControl).toBe('4px');
    expect(tokens.radiusCard).toBe('0px');
  });

  it('reads the page unless told not to', () => {
    expect(pageHints()).toEqual({});
    expect(pageHints({ auto: false })).toBeUndefined();
    expect(pageHints({ auto: { pin: { cardRadius: 12 } } })).toEqual({
      pin: { cardRadius: 12 },
    });
  });
});
