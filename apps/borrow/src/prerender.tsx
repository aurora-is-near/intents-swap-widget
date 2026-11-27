import { createMemoryHistory } from '@tanstack/react-router';
import { renderToString } from 'react-dom/server';

import { App } from '@/App';
import { headOf } from '@/pageHead';
import { createAppRouter } from '@/router';
import type { PageHead } from '@/pageHead';

/**
 * The pages the build writes as HTML of their own (`vite-plugins/prerender.ts`):
 * `/` to `index.html`, any other to `<name>.html`, which `vercel.json`
 * rewrites the path to. A page the app gains needs adding to both; any other
 * path gets `404.html` with status 404.
 */
export const PRERENDERED_PATHS = ['/', '/positions', '/swap'] as const;

/**
 * Renders a page as the app first draws it, disconnected and with markets
 * loading, so its content, links and head are in the HTML before the
 * JavaScript runs. Run at build time only.
 */
export async function render(
  path: string,
): Promise<{ markup: string; head: PageHead }> {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );

  await router.load();

  return {
    markup: renderToString(<App router={router} />),
    head: headOf(router.state.matches),
  };
}
