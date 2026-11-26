/*
 * Constants vite.config.ts reads while it loads, in Node: no imports and
 * nothing that needs the browser, `import.meta.env` or the `@/` alias,
 * which exist only in the app's own build. The app imports them from here
 * too.
 */

/**
 * The `localStorage` key the light/dark choice is saved under. Shared by
 * `ThemeProvider` (src/App.tsx) and the theme init script that vite.config.ts
 * injects into `<head>`, so the two cannot drift apart.
 */
export const THEME_STORAGE_KEY = 'aurora-borrow-theme';
