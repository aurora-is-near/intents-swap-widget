import { completeSeed, deriveTokens, type ThemeSeed } from './derive';
import type { PageThemeHints } from './read';
import { resolveTokens, type ThemeTokens } from './tokens';

/** How the modal is themed. */
export type SupplyTheme = {
  /**
   * Reads the theme from the host page (on by default): its font, colors,
   * radii and density. Hints help the reader, and pin values it gets wrong.
   */
  auto?: boolean | PageThemeHints;
  /**
   * Derives every token from a few choices (colors, radii, density…);
   * unset fields come from Aave's look.
   */
  seed?: Partial<ThemeSeed>;
  /** Exact token values, over the defaults or the derived ones. */
  tokens?: Partial<ThemeTokens>;
};

const defined = <T extends object>(value: T | undefined): Partial<T> =>
  Object.fromEntries(
    Object.entries(value ?? {}).filter(([, field]) => field !== undefined),
  ) as Partial<T>;

/** The page's seed (`pageSeed`, from `readPageTheme`), the theme's over it. */
export const combinedSeed = (
  theme: SupplyTheme = {},
  pageSeed?: Partial<ThemeSeed>,
): Partial<ThemeSeed> => ({ ...defined(pageSeed), ...defined(theme.seed) });

/**
 * The tokens to apply: the defaults, the combined seed derived over them,
 * then exact tokens over all of it.
 */
export const resolveTheme = (
  theme: SupplyTheme = {},
  pageSeed?: Partial<ThemeSeed>,
): ThemeTokens => {
  const combined = combinedSeed(theme, pageSeed);

  return resolveTokens({
    ...(Object.keys(combined).length
      ? deriveTokens(completeSeed(combined))
      : {}),
    ...theme.tokens,
  });
};

/** The reader's hints for a theme, or `undefined` when it doesn't read. */
export const pageHints = (theme?: SupplyTheme): PageThemeHints | undefined => {
  if (theme?.auto === false) {
    return undefined;
  }

  return typeof theme?.auto === 'object' ? theme.auto : {};
};
