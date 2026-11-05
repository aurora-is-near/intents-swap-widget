import type { ThemeTokens } from './tokens';

export { ThemeStyle } from './ThemeStyle';
export {
  CSS_VARIABLES,
  DEFAULT_TOKENS,
  resolveTokens,
  themeCss,
  type ThemeTokens,
} from './tokens';

/** How the modal is themed. */
export type SupplyTheme = {
  /** Exact token values, over the defaults. */
  tokens?: Partial<ThemeTokens>;
};
