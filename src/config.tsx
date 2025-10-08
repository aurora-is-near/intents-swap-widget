import { deepClone } from 'valtio/utils';
import { proxy, useSnapshot } from 'valtio';
import { createContext, useContext, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { EVM_CHAINS } from '@/constants/chains';
import { ErrorBoundary } from '@/features/ErrorBoundary';
import { useAddClassToPortal } from '@/hooks/useAddClassToPortal';
import type { Chains, DefaultChainsFilter } from '@/types/chain';
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

  // Tokens filtering
  showIntentTokens: boolean;
  allowedTokensList: string[] | undefined; // assetIDs
  filterTokens: (token: Token) => boolean;

  // Chains filtering
  chainsOrder: Chains[];
  allowedChainsList: Chains[] | undefined;
  chainsFilter: {
    source: DefaultChainsFilter;
    target: DefaultChainsFilter;
  };

  // 1Click API
  oneClickApiQuoteProxyUrl: string;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000 * 60,
    },
  },
});

const disabledTokens = ['fms', 'abg', 'stjack', 'noear', 'testnebula'];

export const defaultConfig: WipgetConfig = {
  appName: 'Unknown',
  appIcon:
    'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg',

  defaultMaxSlippage: 0.01,
  intentsAccountType: 'evm',
  walletSupportedChains: EVM_CHAINS,
  walletAddress: undefined,

  oneClickApiQuoteProxyUrl: 'https://1click.chaindefuser.com/v0/quote',

  showIntentTokens: true,
  chainsOrder: [
    'eth',
    'btc',
    'near',
    'sol',
    'bsc',
    'base',
    'arb',
    'cardano',
    'sui',
    'ton',
    'pol',
    'op',
    'zec',
    'tron',
    'xrp',
    'avax',
    'bera',
    'xrp',
    'gnosis',
    'doge',
  ],

  filterTokens: (tkn: Token) =>
    !disabledTokens.includes(tkn.symbol.toLocaleLowerCase()),

  allowedTokensList: undefined,
  allowedChainsList: undefined,

  chainsFilter: {
    source: { external: 'wallet-supported', intents: 'with-balance' },
    target: { external: 'all', intents: 'all' },
  },
};

type WipgetConfigContextType = { config: WipgetConfig };

const WipgetConfigContext = createContext<WipgetConfigContextType>({
  config: defaultConfig,
});

type Props = PropsWithChildren<{ config?: WipgetConfig }>;

export const configStore = proxy<{ config: WipgetConfig }>({
  config: defaultConfig,
});

export const useConfig = () => {
  const configState = useContext(WipgetConfigContext);
  const store = useSnapshot(configState);

  return store.config;
};

export const resetConfig = (config: WipgetConfig) => {
  configStore.config = deepClone(config);
};

export const WipgetConfigProvider = ({
  children,
  config: userConfig = defaultConfig,
}: Props) => {
  const storeRef = useRef(proxy({ config: deepClone(userConfig) }));

  useEffect(() => {
    const next = deepClone(userConfig);

    Object.assign(storeRef.current.config, next);
  }, [userConfig]);

  // add tailwind parent class to portal root
  useAddClassToPortal('headlessui-portal-root', 'sw');

  return (
    <QueryClientProvider client={queryClient}>
      <WipgetConfigContext.Provider value={storeRef.current}>
        <ErrorBoundary>
          <div className="sw">{children}</div>
        </ErrorBoundary>
      </WipgetConfigContext.Provider>
    </QueryClientProvider>
  );
};
