import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';

import { intentsConnectApi } from './config';
import { createAaveV3Adapter } from './markets/aaveV3';
import { getClient } from './markets/aaveV3/clients';
import { MarketAdaptersProvider } from './markets/MarketAdaptersProvider';
import type { AppRouter } from './router';
import { THEME_STORAGE_KEY } from './theme';
import { IntentsConnectWalletProvider } from './wallet/IntentsConnectWalletProvider';
import { WalletProvider } from './wallet/WalletProvider';

type AppProps = {
  router: AppRouter;
};

/** The lending protocols Borrow shows: Aave V3 on Base and Arbitrum. */
const marketAdapters = [
  createAaveV3Adapter({ api: intentsConnectApi, getClient }),
];

/**
 * The theme around the wallet and the router, so every route can read and set
 * it and the connect modal follows it. Inside the wallet, Intents Connect gets
 * the API client and the connected wallet; queries share one client per app,
 * and the market adapters sit inside it for the market hooks.
 */
export function App({ router }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider storageKey={THEME_STORAGE_KEY}>
      <QueryClientProvider client={queryClient}>
        <MarketAdaptersProvider adapters={marketAdapters}>
          <WalletProvider>
            <IntentsConnectWalletProvider>
              <RouterProvider router={router} />
            </IntentsConnectWalletProvider>
          </WalletProvider>
        </MarketAdaptersProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
