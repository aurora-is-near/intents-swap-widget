import { ThemeProvider } from '@aurora-is-near/ui-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';

import { intentsConnectApi } from './config';
import { intentsApi } from './intentsApi';
import { createAaveV3Adapter } from './markets/aaveV3';
import { getClient } from './markets/aaveV3/clients';
import { MarketAdaptersProvider } from './markets/MarketAdaptersProvider';
import { PositionsReaderProvider } from './positions/PositionsReaderProvider';
import type { PositionsReader } from './positions/types';
import type { AppRouter } from './router';
import { THEME_STORAGE_KEY } from './theme';
import { IntentsConnectWalletProvider } from './wallet/IntentsConnectWalletProvider';
import { WalletProvider } from './wallet/WalletProvider';

type AppProps = {
  router: AppRouter;
  /**
   * Where My positions and the tab badge read loans from. Without one,
   * nothing is read and the badge stays hidden.
   */
  positionsReader?: PositionsReader;
};

/** The lending protocols Borrow shows: Aave V3 on Base and Arbitrum. */
const marketAdapters = [
  createAaveV3Adapter({ api: intentsConnectApi, getClient }),
];

/**
 * The theme around the wallet and the router, so every route can read and set
 * it and the connect modal follows it. Inside the wallet, Intents Connect gets
 * the API clients and the connected wallet; queries share one client per app,
 * and the market adapters and the positions reader sit inside it for the
 * market and positions hooks.
 */
export function App({ router, positionsReader }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider storageKey={THEME_STORAGE_KEY}>
      <QueryClientProvider client={queryClient}>
        <MarketAdaptersProvider adapters={marketAdapters}>
          <PositionsReaderProvider reader={positionsReader ?? null}>
            <WalletProvider>
              <IntentsConnectWalletProvider intentsApi={intentsApi}>
                <RouterProvider router={router} />
              </IntentsConnectWalletProvider>
            </WalletProvider>
          </PositionsReaderProvider>
        </MarketAdaptersProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
