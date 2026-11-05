import { completeSeed, deriveTokens, type ThemeSeed } from './derive';
import { resolveTokens, type ThemeTokens } from './tokens';

/** How the modal is themed. */
export type SupplyTheme = {
  /**
   * Derives every token from a few choices (colors, radii, density…);
   * unset fields come from Aave's look.
   */
  seed?: Partial<ThemeSeed>;
  /** Exact token values, over the defaults or the derived ones. */
  tokens?: Partial<ThemeTokens>;
};

/** The tokens to apply: defaults, then the seed's, then exact overrides. */
export const resolveTheme = ({ seed, tokens }: SupplyTheme = {}): ThemeTokens =>
  resolveTokens({
    ...(seed ? deriveTokens(completeSeed(seed)) : {}),
    ...tokens,
  });
