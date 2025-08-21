import { deepClone } from 'valtio/utils';
import { proxy, useSnapshot } from 'valtio';
import { createContext, useContext, useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { EVM_CHAINS } from '@/constants/chains';
import type { Chains, DefaultChainsFilter } from '@/types/chain';

export type WipgetConfig = {
  referral: string;
  topScreenOffset: string;
  intentsAccountType: 'evm' | 'near';
  defaultMaxSlippage: number; // percentage
  walletSupportedChains: ReadonlyArray<Chains>;
  walletAddress: string | undefined | null;
  chainsFilter: {
    source: DefaultChainsFilter;
    target: DefaultChainsFilter;
  };
};

export const defaultConfig: WipgetConfig = {
  referral: 'Unknown',
  intentsAccountType: 'evm',
  defaultMaxSlippage: 0.01,
  // 74px - height of the header
  // 10vh - desired offset from the top of the screen
  topScreenOffset: '10vh + 74px',
  walletSupportedChains: EVM_CHAINS,
  walletAddress: undefined,
  chainsFilter: {
    source: { external: 'wallet-supported', calyx: 'with-balance' },
    target: { external: 'all', calyx: 'all' },
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

export const WipgetConfigProvider = ({
  children,
  config: userConfig = defaultConfig,
}: Props) => {
  useEffect(() => {
    configStore.config = deepClone(userConfig);
  }, [userConfig]);

  return (
    <WipgetConfigContext.Provider value={configStore.config}>
      {children}
    </WipgetConfigContext.Provider>
  );
};
