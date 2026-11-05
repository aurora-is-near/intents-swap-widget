import { useMemo } from 'react';

import { useInspected, useSeedEdits, withEdits } from './inspect/bridge';
import { pageHints, resolveTheme, type SupplyTheme } from './resolve';
import { themeCss } from './tokens';
import { usePageTheme } from './usePageTheme';

/**
 * The theme, as a `:host` rule inside the shadow root: it comes after the
 * base sheet, and unlayered, so it beats both its `:host` rule and
 * Tailwind's `@layer theme` defaults. Unless `theme.auto` is `false`, it
 * starts from the host page's own look. In dev builds, the theme inspector
 * sees what it applies and edits it live.
 */
export const ThemeStyle = ({ theme }: { theme?: SupplyTheme }) => {
  const edits = useSeedEdits();
  const applied = useMemo(() => withEdits(theme, edits), [theme, edits]);
  const hints = useMemo(() => pageHints(applied), [applied]);
  const reading = usePageTheme(hints);
  const tokens = useMemo(
    () => resolveTheme(applied, reading?.seed),
    [applied, reading],
  );

  const css = useMemo(() => themeCss(tokens), [tokens]);

  useInspected({ theme, reading, tokens });

  return <style data-aurora-theme="">{css}</style>;
};
