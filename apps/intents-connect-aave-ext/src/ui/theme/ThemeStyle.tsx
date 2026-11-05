import { useMemo } from 'react';

import { resolveTheme, type SupplyTheme } from './resolve';
import { themeCss } from './tokens';

/**
 * The theme, as a `:host` rule inside the shadow root: it comes after the
 * base sheet, and unlayered, so it beats both its `:host` rule and
 * Tailwind's `@layer theme` defaults.
 */
export const ThemeStyle = ({ theme }: { theme?: SupplyTheme }) => {
  const css = useMemo(() => themeCss(resolveTheme(theme)), [theme]);

  return <style data-aurora-theme="">{css}</style>;
};
