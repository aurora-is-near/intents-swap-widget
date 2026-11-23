import { getThemeInitScript } from '@aurora-is-near/ui-kit';
import type { HtmlTagDescriptor, Plugin } from 'vite';

/** The `<script>` the plugin puts first in `<head>`. */
export const themeInitScriptTags = (
  storageKey: string,
): HtmlTagDescriptor[] => [
  {
    tag: 'script',
    children: getThemeInitScript(storageKey),
    injectTo: 'head-prepend',
  },
];

/**
 * Inlines the kit's theme init script at the top of index.html's `<head>`,
 * so a stored light/dark choice applies before React mounts and the first
 * paint never flashes the system theme (ui-kit ruling F16). Pass the same
 * storage key as `ThemeProvider`.
 */
export const themeInitScript = (storageKey: string): Plugin => ({
  name: 'borrow-theme-init-script',
  transformIndexHtml: () => themeInitScriptTags(storageKey),
});
