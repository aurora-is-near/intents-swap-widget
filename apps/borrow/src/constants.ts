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

/** The vaults.fyi API the proxy uses when `VAULTS_FYI_API_URL` is not set. */
export const DEFAULT_VAULTS_FYI_API_URL = 'https://api.vaults.fyi';

/**
 * Where the vaults.fyi key proxy is mounted: the Vite dev and preview
 * middleware (vite-plugins/vaultsFyiProxy.ts) and the Vercel Edge Function
 * api/vaults-fyi.ts behind the vercel.json rewrite. The positions reader
 * calls it same-origin.
 */
export const VAULTS_FYI_PROXY_PATH = '/api/vaults-fyi';
