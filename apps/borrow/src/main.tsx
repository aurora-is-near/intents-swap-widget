import '@/index.css';

import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { App } from '@/App';
import { headOf } from '@/pageHead';
import { createAppRouter } from '@/router';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('index.html has no #root element.');
}

const router = createAppRouter();

// Each page's HTML carries its own title (the build's prerender); this keeps
// it in step as the person moves between pages.
router.subscribe('onResolved', () => {
  document.title = headOf(router.state.matches).title;
});

const app = (
  <StrictMode>
    <App router={router} />
  </StrictMode>
);

// A built page arrives prerendered (vite-plugins/prerender.ts): hydrate it so
// its content stays in place, once the router has matched the route as the
// prerender did. In dev, and on 404.html, #root is empty.
if (rootElement.hasChildNodes()) {
  // The router's hydration mode, as TanStack's own client hydration sets it:
  // it then renders the same tree as on the server (no extra Suspense).
  router.ssr = { manifest: undefined };
  router.load().then(
    () => hydrateRoot(rootElement, app),
    () => createRoot(rootElement).render(app),
  );
} else {
  createRoot(rootElement).render(app);
}
