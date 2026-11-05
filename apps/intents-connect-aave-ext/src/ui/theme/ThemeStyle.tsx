import { useMemo } from 'react';

import { resolveTokens, themeCss, type ThemeTokens } from './tokens';

/**
 * The theme, as a `:host` rule inside the shadow root: it comes after the
 * base sheet, and unlayered, so it beats both its `:host` rule and
 * Tailwind's `@layer theme` defaults.
 */
export const ThemeStyle = ({ tokens }: { tokens?: Partial<ThemeTokens> }) => {
  const css = useMemo(() => themeCss(resolveTokens(tokens)), [tokens]);

  return <style data-aurora-theme="">{css}</style>;
};
