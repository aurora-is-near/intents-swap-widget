'use client';

import {
  ComponentType,
  createContext,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Eip1193Provider } from 'ethers';
import { useTheme } from '../hooks/useTheme';
import { logger } from '../logger';
import { AppKit } from '../types/appkit';
import { SolanaProvider } from '../types';
import { useConfig } from '@/config';

type AppKitProviderProps = {
  children: ReactNode;
};

// There are some differences between the Solana provider type provided by
// `@reown/appkit-adapter-solana/react` and the one that we expose. The main
// difference relevant to us is in the `signMessage` method signature. As we
// do not want to import any AppKit dependencies here we create a minimal,
// custom type, below.
type AppKitSolanaProvider = Omit<SolanaProvider, 'signMessage'> & {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
};

// A minimal copy of the disconnect method signature provided by
// `@reown/appkit/react`.
type AppKitDisconnect = (params?: {
  namespace?:
    | 'eip155'
    | 'solana'
    | 'polkadot'
    | 'bip122'
    | 'cosmos'
    | 'sui'
    | 'stacks';
}) => Promise<void>;

export type AppKitContextType = {
  isLoading: boolean;
  appKit: AppKit | null;
  address?: string;
  disconnect: AppKitDisconnect;
  evmProvider?: Eip1193Provider;
  solanaProvider?: AppKitSolanaProvider;
};

const DEFAULT_CONTEXT: AppKitContextType = {
  isLoading: true,
  appKit: null,
  disconnect: async () => {},
};

export const AppKitContext = createContext<AppKitContextType | undefined>(
  undefined,
);

export const AppKitProvider = ({ children }: AppKitProviderProps) => {
  const wasEnabled = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [Bridge, setBridge] = useState<ComponentType<{
    children: ReactNode;
  }> | null>(null);

  const config = useConfig();
  const theme = useTheme();

  useEffect(() => {
    if (!config.enableStandaloneMode || wasEnabled.current) {
      setIsLoading(false);

      return;
    }

    wasEnabled.current = true;

    // Dynamically import AppKit and its dependencies only when standalone mode
    // is enabled. The factory loads @reown packages via dynamic import() so
    // consumer bundlers skip resolution when those packages are not installed.
    import('../appkit')
      .then(({ createAppKitBridge }) => createAppKitBridge())
      .then(({ AppKitBridge }) => {
        setBridge(() => AppKitBridge);
      })
      .catch((err) => {
        logger.error(err);
        logger.error(
          'Failed to load AppKit. To use enableStandaloneMode please install the ' +
            '@reown/appkit dependencies as mentioned in the documentation: ' +
            'https://aurora-labs.gitbook.io/intents-swap-widget',
        );
      });

    setIsLoading(false);
  }, [config, theme]);

  const defaultContextValue = useMemo(
    () => ({
      ...DEFAULT_CONTEXT,
      isLoading,
    }),
    [isLoading],
  );

  if (Bridge) {
    return <Bridge>{children}</Bridge>;
  }

  return (
    <AppKitContext.Provider value={defaultContextValue}>
      {children}
    </AppKitContext.Provider>
  );
};
