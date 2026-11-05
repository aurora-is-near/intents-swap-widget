import type { SEED_RANGES, ThemeSeed } from '../derive';
import type { ThemeTokens } from '../tokens';
import type { InspectedTheme, SeedEdits } from './store';

type ColorKey =
  | 'page'
  | 'surface'
  | 'text'
  | 'textSecondary'
  | 'accent'
  | 'accentText'
  | 'danger';

/** A seed field, and how the inspector edits it. */
export type SeedField = { about: string } & (
  | {
      key: ColorKey;
      kind: 'color';
      /** Unset, it's derived: this token shows what it came out as. */
      derivedAs?: keyof ThemeTokens;
    }
  | {
      key: keyof typeof SEED_RANGES;
      kind: 'range';
      step: number;
      unit: string;
    }
  | { key: 'scheme'; kind: 'scheme' }
  | { key: 'font'; kind: 'font' }
);

export const SEED_FIELDS: readonly SeedField[] = [
  { key: 'scheme', kind: 'scheme', about: 'Light or dark shades' },
  { key: 'page', kind: 'color', about: "The page's background: the dialog" },
  {
    key: 'surface',
    kind: 'color',
    about: 'Cards on the page: our tabs and secondary buttons',
  },
  { key: 'text', kind: 'color', about: 'Body text' },
  {
    key: 'textSecondary',
    kind: 'color',
    derivedAs: 'textSecondary',
    about: 'Secondary text; mixed from the text when unset',
  },
  { key: 'accent', kind: 'color', about: 'The primary button: our CTA' },
  {
    key: 'accentText',
    kind: 'color',
    derivedAs: 'ctaText',
    about: "The text on it; black or white when unset or it doesn't read",
  },
  { key: 'danger', kind: 'color', about: 'Errors and warnings' },
  { key: 'font', kind: 'font', about: 'The font stack' },
  {
    key: 'fontSize',
    kind: 'range',
    step: 1,
    unit: 'px',
    about: "Base text size: ours on every site, the page's isn't read",
  },
  {
    key: 'fontWeight',
    kind: 'range',
    step: 100,
    unit: '',
    about: 'Titles and amounts',
  },
  {
    key: 'controlRadius',
    kind: 'range',
    step: 1,
    unit: 'px',
    about: "Buttons' corners (a pill reads as 24)",
  },
  {
    key: 'cardRadius',
    kind: 'range',
    step: 1,
    unit: 'px',
    about: "Cards' and the dialog's corners",
  },
  {
    key: 'density',
    kind: 'range',
    step: 0.01,
    unit: '×',
    about: 'Spacing, against a 4 px unit',
  },
];

/**
 * Where a seed value comes from: `edit`, `theme.seed`, the reader's
 * evidence (`pin`, `mui`, `computed:buttons(3)`…), `derived` for a paired
 * value left unset, or `default` (Aave's).
 */
export const seedSource = (
  key: keyof ThemeSeed,
  { theme, reading }: Pick<InspectedTheme, 'theme' | 'reading'>,
  edits: SeedEdits,
  value: unknown,
): string => {
  if (edits[key] !== undefined) {
    return 'edit';
  }

  if (theme?.seed?.[key] !== undefined) {
    return 'theme.seed';
  }

  return (
    reading?.evidence[key] ?? (value === undefined ? 'derived' : 'default')
  );
};
