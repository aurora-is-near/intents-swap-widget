import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { RouterProvider } from '@tanstack/react-router';

import type { AppRouter } from './router';
import { THEME_STORAGE_KEY } from './theme';
import { WalletProvider } from './wallet/WalletProvider';

type AppProps = {
  router: AppRouter;
};

/**
 * The theme around the wallet and the router, so every route can read and set
 * it and the connect modal follows it.
 */
export function App({ router }: AppProps) {
  return (
    <ThemeProvider storageKey={THEME_STORAGE_KEY}>
      <WalletProvider>
        <RouterProvider router={router} />
      </WalletProvider>
    </ThemeProvider>
  );
}
