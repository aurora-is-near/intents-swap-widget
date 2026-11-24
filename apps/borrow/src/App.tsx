import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { RouterProvider } from '@tanstack/react-router';

import type { AppRouter } from './router';
import { THEME_STORAGE_KEY } from './theme';

type AppProps = {
  router: AppRouter;
};

/** The theme around the router, so every route can read and set it. */
export function App({ router }: AppProps) {
  return (
    <ThemeProvider storageKey={THEME_STORAGE_KEY}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
