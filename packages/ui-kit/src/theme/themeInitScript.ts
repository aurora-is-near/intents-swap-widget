/** The `localStorage` key `ThemeProvider` saves an explicit choice under. */
export const DEFAULT_THEME_STORAGE_KEY = 'aurora-ui-theme';

/**
 * A script for the app to inline in `<head>`, before its stylesheet paints.
 * It writes the theme as `data-theme` on `<html>`, as `ThemeProvider` does
 * once it mounts: a stored light or dark choice, else the system theme. The
 * first paint then already has the right palette, which tokens.css declares
 * only under `data-theme` (no `prefers-color-scheme` copy).
 *
 * Pass the same `storageKey` as `ThemeProvider`. No React: it runs before the
 * app's JavaScript and is safe to import from build config.
 */
export function getThemeInitScript(
  storageKey: string = DEFAULT_THEME_STORAGE_KEY,
): string {
  // `<` escaped so a key can never close the surrounding <script> tag.
  const key = JSON.stringify(storageKey).replace(/</g, '\\u003c');

  return `(function(){var t;try{t=localStorage.getItem(${key})}catch(e){}if(t!=='light'&&t!=='dark'){try{t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){t='light'}}document.documentElement.dataset.theme=t})();`;
}
