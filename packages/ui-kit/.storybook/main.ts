import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { mergeConfig } from 'vite';
import type { StorybookConfig } from '@storybook/react-vite';

const here = dirname(fileURLToPath(import.meta.url));
const KIT_SRC = resolve(here, '../src');
const BORROW_SRC = resolve(here, '../../../apps/borrow/src');

/**
 * The kit's design system and components, and Borrow's own components
 * (stories under apps/borrow/src, titled "Borrow/…"), in one Storybook.
 * Published with the Borrow site at /storybook (`yarn build-storybook`, run
 * by Borrow's build).
 */
const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {
      // Not the kit's vite.config.ts: that is the library build (dts, lib
      // entry), which Storybook must not run.
      builder: { viteConfigPath: resolve(here, 'vite.config.ts') },
    },
  },
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(ts|tsx)',
    {
      directory: '../../../apps/borrow/src',
      files: '**/*.stories.@(ts|tsx)',
      titlePrefix: 'Borrow',
    },
  ],
  addons: ['@storybook/addon-docs'],
  // A public design system: no "Get started" checklist or release notices.
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
  core: {
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
  },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      resolve: {
        // One copy of the kit (its source), so Borrow's components and the
        // kit's stories share the same theme context.
        alias: [
          {
            find: /^@aurora-is-near\/ui-kit$/,
            replacement: resolve(KIT_SRC, 'index.ts'),
          },
          // Borrow's stories import Borrow code through its `@/` alias. The
          // kit's own source uses relative imports only.
          { find: /^@\//, replacement: `${BORROW_SRC}/` },
        ],
      },
    }),
};

export default config;
