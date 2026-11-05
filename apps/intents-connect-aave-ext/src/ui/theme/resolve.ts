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

/**
 * The tokens to apply: the defaults, the page's seed (`pageSeed`, from
 * `readPageTheme`), the theme's own seed over it, derived; then exact
 * tokens over all of it.
 */
export const resolveTheme = (
  { seed, tokens }: SupplyTheme = {},
  pageSeed?: Partial<ThemeSeed>,
): ThemeTokens => {
  const combined = { ...defined(pageSeed), ...defined(seed) };

  return resolveTokens({
    ...(Object.keys(combined).length
      ? deriveTokens(completeSeed(combined))
      : {}),
    ...tokens,
  });
};

/** The reader's hints for a theme, or `undefined` when it doesn't read. */
export const pageHints = (theme?: SupplyTheme): PageThemeHints | undefined => {
  if (theme?.auto === false) {
    return undefined;
  }

  return typeof theme?.auto === 'object' ? theme.auto : {};
};
