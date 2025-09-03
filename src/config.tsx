import { deepClone } from 'valtio/utils';
import { proxy, useSnapshot } from 'valtio';
import { createContext, useContext, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { EVM_CHAINS } from '@/constants/chains';
import { useAddClassToPortal } from '@/hooks/useAddClassToPortal';
import type { Chain, Chains, DefaultChainsFilter } from '@/types/chain';
import type { Token } from '@/types/token';

export type WipgetConfig = {
  // Application metadata
  appName: string;
  appIcon: string;

  // Connected wallet
  intentsAccountType: 'evm' | 'near' | 'sol';
  walletSupportedChains: ReadonlyArray<Chains>;
  walletAddress: string | undefined | null;

  // Quotes & Transfers
  defaultMaxSlippage: number;

  // Chains & Tokens filtering
  showIntentTokens: boolean;
  filterTokens: (token: Token) => boolean;
  filterChains: (chain: Chain) => boolean;

  chainsFilter: {
    source: DefaultChainsFilter;
    target: DefaultChainsFilter;
  };
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000 * 60,
    },
  },
});

export const defaultConfig: WipgetConfig = {
  appName: 'Unknown',
  appIcon:
    'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg',

  defaultMaxSlippage: 0.01,
  intentsAccountType: 'evm',
  walletSupportedChains: EVM_CHAINS,
  walletAddress: undefined,

  filterChains: () => true,
  filterTokens: () => true,
  showIntentTokens: true,
  chainsFilter: {
    source: { external: 'wallet-supported', intents: 'with-balance' },
    target: { external: 'all', intents: 'all' },
  },
};

type WipgetConfigContextType = WipgetConfig;

const WipgetConfigContext =
  createContext<WipgetConfigContextType>(defaultConfig);

type Props = PropsWithChildren<{ config?: WipgetConfig }>;

export const configStore = proxy<{ config: WipgetConfig }>({
  config: defaultConfig,
});

export const useConfig = () => {
  const configState = useContext(WipgetConfigContext);
  const config = useSnapshot(configState);

  return config;
};

export const resetConfig = (config: WipgetConfig) => {
  configStore.config = deepClone(config);
};

export const WipgetConfigProvider = ({
  children,
  config: userConfig = defaultConfig,
}: Props) => {
  useEffect(() => {
    configStore.config = deepClone(userConfig);
  }, [userConfig]);

  // add tailwind parent class to portal root
  useAddClassToPortal('headlessui-portal-root', 'sw');

  return (
    <QueryClientProvider client={queryClient}>
      <WipgetConfigContext.Provider value={configStore.config}>
        <div className="sw">{children}</div>
      </WipgetConfigContext.Provider>
    </QueryClientProvider>
  );
};
