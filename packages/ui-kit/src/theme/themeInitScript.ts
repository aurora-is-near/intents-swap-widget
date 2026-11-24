/** The `localStorage` key `ThemeProvider` saves an explicit choice under. */
export const DEFAULT_THEME_STORAGE_KEY = 'aurora-ui-theme';

/**
 * A script for the app to inline in `<head>`, before its stylesheet paints.
 * It applies a stored light or dark choice as `data-theme` on `<html>`, so a
 * user whose choice differs from the system theme doesn't see the system
 * theme flash before `ThemeProvider` mounts. With no stored choice it does
 * nothing, and the tokens' `prefers-color-scheme` fallback applies.
 *
 * Pass the same `storageKey` as `ThemeProvider`. No React: it runs before the
 * app's JavaScript and is safe to import from build config.
 */
export function getThemeInitScript(
  storageKey: string = DEFAULT_THEME_STORAGE_KEY,
): string {
  // `<` escaped so a key can never close the surrounding <script> tag.
  const key = JSON.stringify(storageKey).replace(/</g, '\\u003c');

  return `(function(){try{var t=localStorage.getItem(${key});if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})();`;
}
