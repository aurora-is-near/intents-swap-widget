import { deepClone } from 'valtio/utils';
import { proxy, useSnapshot } from 'valtio';
import { createContext, useContext, useEffect, useRef } from 'react';
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
  chainsOrder: Chains[];

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

const disabledTokens = ['fms', 'abg', 'stjack', 'noear', 'testnebula'];

export const defaultConfig: WipgetConfig = {
  appName: 'Unknown',
  appIcon:
    'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg',

  defaultMaxSlippage: 0.01,
  intentsAccountType: 'evm',
  walletSupportedChains: EVM_CHAINS,
  walletAddress: undefined,

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

  filterChains: () => true,
  filterTokens: (tkn: Token) =>
    !disabledTokens.includes(tkn.symbol.toLocaleLowerCase()),

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
        <div className="sw">{children}</div>
      </WipgetConfigContext.Provider>
    </QueryClientProvider>
  );
};
