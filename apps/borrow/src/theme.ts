/**
 * The `localStorage` key the light/dark choice is saved under. Shared by
 * `ThemeProvider` (src/App.tsx) and the theme init script that vite.config.ts
 * injects into `<head>`, so the two cannot drift apart.
 */
export const THEME_STORAGE_KEY = 'aurora-borrow-theme';
