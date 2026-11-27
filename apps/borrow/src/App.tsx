import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';

import { createAaveV3Adapter } from '@/domains/markets/aaveV3';
import { getClient } from '@/domains/markets/aaveV3/config/clients';
import { MarketAdaptersProvider } from '@/domains/markets/providers/MarketAdaptersProvider';
import { intentsConnectActionsApi, intentsConnectApi } from '@/config';
import { THEME_STORAGE_KEY } from '@/constants';
import { IntentsConnectWalletProvider } from '@/domains/wallet/providers/IntentsConnectWalletProvider';
import { WalletProvider } from '@/domains/wallet/providers/WalletProvider';
import type { AppRouter } from '@/router';

type AppProps = {
  router: AppRouter;
};

/** The lending protocols Borrow shows: Aave V3 on Base and Arbitrum. */
const marketAdapters = [
  createAaveV3Adapter({
    api: intentsConnectApi,
    getClient,
    actionsApi: intentsConnectActionsApi,
  }),
];

/**
 * The theme around the wallet and the router, so every route can read and set
 * it and the connect modal follows it. Inside the wallet, Intents Connect gets
 * the API clients and the connected wallet; queries share one client per app,
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
