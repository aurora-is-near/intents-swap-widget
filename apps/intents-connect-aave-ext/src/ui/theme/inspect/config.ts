import type { ThemeSeed } from '../derive';
import type { SupplyTheme } from '../resolve';
import type { SeedEdits } from './store';

const pick = (edits: SeedEdits, keys: readonly (keyof ThemeSeed)[]) =>
  Object.fromEntries(keys.map((key) => [key, edits[key]])) as SeedEdits;

/**
 * The theme a site adapter passes to get what the inspector shows: `theme`
 * with each edited value pinned for the page reader (`auto.pin`). A value
 * the theme already sets in `seed`, or every value when it doesn't read the
 * page (`auto: false`), goes in `seed` instead.
 */
export const themeConfig = (
  theme: SupplyTheme = {},
  edits: SeedEdits = {},
): SupplyTheme => {
  const keys = Object.keys(edits) as (keyof ThemeSeed)[];
  const reads = theme.auto !== false;
  const toSeed = keys.filter(
    (key) => !reads || theme.seed?.[key] !== undefined,
  );

  const toPin = keys.filter((key) => !toSeed.includes(key));
  const hints = typeof theme.auto === 'object' ? theme.auto : {};

  return {
    ...theme,
    ...(toPin.length
      ? { auto: { ...hints, pin: { ...hints.pin, ...pick(edits, toPin) } } }
      : {}),
    ...(toSeed.length
      ? { seed: { ...theme.seed, ...pick(edits, toSeed) } }
      : {}),
  };
};
