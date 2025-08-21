import { deepClone } from 'valtio/utils';
import { proxy, useSnapshot } from 'valtio';
import { createContext, useContext, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { EVM_CHAINS } from '@/constants/chains';
import type { Chain, Chains, DefaultChainsFilter } from '@/types/chain';
import type { Token } from '@/types/token';

export type WipgetConfig = {
  // Application metadata
  appName: string;
  appIcon: string;

  // Layout and UI
  topScreenOffset: string;

  // Connected wallet
  intentsAccountType: 'evm' | 'near';
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

export const defaultConfig: WipgetConfig = {
  appName: 'Unknown',
  appIcon:
    'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg',

  // 74px - height of the header
  // 10vh - desired offset from the top of the screen
  topScreenOffset: '10vh + 74px',
  defaultMaxSlippage: 0.01,

  intentsAccountType: 'near',
  walletSupportedChains: ['near'],
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

export const configStore = proxy<{
  config: Omit<WipgetConfig, 'filterChains' | 'filterTokens'>;
}>({
  config: defaultConfig,
});

export const useConfig = () => {
  const configState = useContext(WipgetConfigContext);
  const config = useSnapshot(configState);

  return config;
};

export const WipgetConfigProvider = ({
  children,
  config: userConfig = defaultConfig,
}: Props) => {
  // do not add functions to valtio proxy
  const { filterChains, filterTokens, ...restConfig } = userConfig;

  useEffect(() => {
    configStore.config = deepClone(restConfig);
  }, [restConfig]);

  const providerValue = useMemo(
    () => ({
      ...configStore.config,
      filterChains,
      filterTokens,
    }),
    [userConfig],
  );

  return (
    <WipgetConfigContext.Provider value={providerValue}>
      {children}
    </WipgetConfigContext.Provider>
  );
};
