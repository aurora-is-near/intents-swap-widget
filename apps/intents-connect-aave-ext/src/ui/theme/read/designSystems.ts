import { formatColor } from '../color';
import type { ThemeSeed } from '../derive';
import { toRgba } from './normalize';

type ColorField = Extract<
  keyof ThemeSeed,
  | 'page'
  | 'surface'
  | 'text'
  | 'textSecondary'
  | 'accent'
  | 'accentText'
  | 'danger'
>;

type DesignSystem = {
  id: string;
  /** Present only when the system is in use. */
  detect: string;
  /** Candidate variables per seed field, first found wins. */
  fields: Partial<Record<ColorField, readonly string[]>>;
};

/**
 * Design systems whose CSS variables name a page's palette. Colors only:
 * radii come from measured components (Aave's MUI radius
 * variable says 4 px while its buttons render at 8).
 */
const SYSTEMS: readonly DesignSystem[] = [
  {
    id: 'mui',
    detect: '--mui-palette-primary-main',
    fields: {
      page: ['--mui-palette-background-default'],
      surface: ['--mui-palette-background-paper'],
      text: ['--mui-palette-text-primary'],
      textSecondary: ['--mui-palette-text-secondary'],
      accent: ['--mui-palette-primary-main'],
      accentText: ['--mui-palette-primary-contrastText'],
      danger: ['--mui-palette-error-main'],
    },
  },
  {
    id: 'shadcn',
    detect: '--primary-foreground',
    fields: {
      page: ['--background'],
      surface: ['--card', '--popover'],
      text: ['--foreground'],
      textSecondary: ['--muted-foreground'],
      accent: ['--primary'],
      accentText: ['--primary-foreground'],
      danger: ['--destructive'],
    },
  },
  {
    id: 'radix',
    detect: '--accent-9',
    fields: {
      page: ['--color-background'],
      surface: ['--color-panel-solid'],
      text: ['--gray-12'],
      textSecondary: ['--gray-11'],
      accent: ['--accent-9'],
      accentText: ['--accent-contrast'],
      danger: ['--red-9'],
    },
  },
  {
    id: 'mantine',
    detect: '--mantine-primary-color-filled',
    fields: {
      page: ['--mantine-color-body'],
      text: ['--mantine-color-text'],
      textSecondary: ['--mantine-color-dimmed'],
      accent: ['--mantine-primary-color-filled'],
      accentText: ['--mantine-primary-color-contrast'],
      danger: ['--mantine-color-error'],
    },
  },
  {
    id: 'bootstrap',
    detect: '--bs-primary',
    fields: {
      page: ['--bs-body-bg'],
      text: ['--bs-body-color'],
      textSecondary: ['--bs-secondary-color'],
      accent: ['--bs-primary'],
      danger: ['--bs-danger'],
    },
  },
];

const RGB_TRIPLE = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/;
const HSL_TRIPLE = /^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%$/;

/**
 * A variable's color. MUI's `*Channel` twin is an exact sRGB triple
 * ("235 66 0"), preferred over the color, which Chrome may report in P3;
 * shadcn writes bare HSL triples ("222 47% 11%").
 */
const cssColorOf = (read: (name: string) => string, name: string) => {
  const channel = read(`${name}Channel`);

  if (RGB_TRIPLE.test(channel)) {
    return `rgb(${channel})`;
  }

  const raw = read(name);

  return HSL_TRIPLE.test(raw) ? `hsl(${raw})` : raw;
};

const colorOf = (read: (name: string) => string, name: string) => {
  const color = toRgba(cssColorOf(read, name));

  return color && color.a > 0 ? formatColor(color) : undefined;
};

/**
 * The palette a page's design system declares, read through `read` (a
 * custom property's computed value). `undefined` when no known system is
 * in use.
 */
export const readDesignSystem = (
  read: (name: string) => string,
): { id: string; values: Partial<Record<ColorField, string>> } | undefined => {
  const system = SYSTEMS.find(({ detect }) => read(detect) !== '');

  if (!system) {
    return undefined;
  }

  const values: Partial<Record<ColorField, string>> = {};

  (Object.keys(system.fields) as ColorField[]).forEach((field) => {
    const color = system.fields[field]!.map((name) => colorOf(read, name)).find(
      Boolean,
    );

    if (color) {
      values[field] = color;
    }
  });

  return { id: system.id, values };
};
