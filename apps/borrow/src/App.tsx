import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';

import type { AppRouter } from './router';
import { THEME_STORAGE_KEY } from './theme';
import { IntentsConnectWalletProvider } from './wallet/IntentsConnectWalletProvider';
import { WalletProvider } from './wallet/WalletProvider';

type AppProps = {
  router: AppRouter;
};

/**
 * The theme around the wallet and the router, so every route can read and set
 * it and the connect modal follows it. Inside the wallet, Intents Connect gets
 * the API client and the connected wallet; queries share one client per app.
 */
export function App({ router }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider storageKey={THEME_STORAGE_KEY}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <IntentsConnectWalletProvider>
            <RouterProvider router={router} />
          </IntentsConnectWalletProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
