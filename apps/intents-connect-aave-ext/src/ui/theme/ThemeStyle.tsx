import { useMemo } from 'react';

import { pageHints, resolveTheme, type SupplyTheme } from './resolve';
import { themeCss } from './tokens';
import { usePageTheme } from './usePageTheme';

/**
 * The theme, as a `:host` rule inside the shadow root: it comes after the
 * base sheet, and unlayered, so it beats both its `:host` rule and
 * Tailwind's `@layer theme` defaults. Unless `theme.auto` is `false`, it
 * starts from the host page's own look.
 */
export const ThemeStyle = ({ theme }: { theme?: SupplyTheme }) => {
  const hints = useMemo(() => pageHints(theme), [theme]);
  const reading = usePageTheme(hints);
  const css = useMemo(
    () => themeCss(resolveTheme(theme, reading?.seed)),
    [theme, reading],
  );

  return <style data-aurora-theme="">{css}</style>;
};
