import i18n from 'i18next';
import { deepClone } from 'valtio/utils';
import { proxy, useSnapshot } from 'valtio';
import { createContext, useContext, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';

import { initLocalisation } from './localisation';
import { LocalisationDict } from './types/localisation';
import { WidgetConfig } from './types/config';
import { BalanceRpcLoader } from './features';
import { DEFAULT_RPCS } from './rpcs';
import { ChainRpcUrls } from './types';
import { Theme } from './types/theme';
import { ThemeProvider } from './theme/ThemeProvider';
import type { Token } from '@/types/token';
import { useAddClassToPortal } from '@/hooks/useAddClassToPortal';
import { ErrorBoundary } from '@/features/ErrorBoundary';
import { EVM_CHAINS } from '@/constants/chains';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000 * 60,
    },
  },
});

const DISABLED_TOKENS = ['fms', 'abg', 'stjack', 'noear', 'testnebula'];

const DEFAULT_CONFIG: WidgetConfig = {
  appName: 'Unknown',
  appIcon:
    'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg',

  defaultMaxSlippage: 0.01,
  intentsAccountType: 'evm',
  walletSupportedChains: EVM_CHAINS,
  connectedWallets: {},

  oneClickApiQuoteProxyUrl: 'https://1click.chaindefuser.com/v0/quote',

  enableAutoTokensSwitching: true,
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
    !DISABLED_TOKENS.includes(tkn.symbol.toLocaleLowerCase()),

  chainsFilter: {
    source: { external: 'wallet-supported', intents: 'none' },
    target: { external: 'all', intents: 'none' },
  },
};

type WidgetConfigContextType = { config: WidgetConfig };

const WidgetConfigContext = createContext<WidgetConfigContextType>({
  config: DEFAULT_CONFIG,
});

type Props = PropsWithChildren<{
  config: Partial<WidgetConfig>;
  localisation?: LocalisationDict;
  rpcs?: ChainRpcUrls;
  theme?: Theme;
}>;

export const configStore = proxy<{ config: WidgetConfig }>({
  config: DEFAULT_CONFIG,
});

export const useConfig = () => {
  const configState = useContext(WidgetConfigContext);
  const store = useSnapshot(configState);

  return store.config;
};

const resetConfig = (config: WidgetConfig) => {
  configStore.config = deepClone(config);
};

export const WidgetConfigProvider = ({
  children,
  config: userConfig,
  localisation,
  rpcs,
  theme,
}: Props) => {
  const storeRef = useRef(
    proxy({
      config: deepClone({
        ...DEFAULT_CONFIG,
        ...userConfig,
      }),
    }),
  );

  useEffect(() => {
    const next = deepClone({
      ...DEFAULT_CONFIG,
      ...userConfig,
    });

    Object.assign(storeRef.current.config, next);
    resetConfig(next);
  }, [userConfig]);

  // Initialise localisation
  initLocalisation(localisation ?? {});

  // Add tailwind parent class to portal root
  useAddClassToPortal('headlessui-portal-root', 'sw');

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <WidgetConfigContext.Provider value={storeRef.current}>
          <ThemeProvider theme={theme}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ThemeProvider>
          <BalanceRpcLoader
            rpcs={rpcs ?? DEFAULT_RPCS}
            connectedWallets={userConfig.connectedWallets ?? {}}
          />
        </WidgetConfigContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
};
