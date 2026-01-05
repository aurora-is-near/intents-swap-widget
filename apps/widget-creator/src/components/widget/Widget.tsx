import { useMemo, useState } from 'react';
import {
  Button,
  type MakeTransferArgs,
  SuccessScreen,
  type WidgetConfig,
  WidgetConfigProvider,
  WidgetContainer,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import { useCreator } from '../../hooks/useCreatorConfig';
import { useAppKitWallet } from '../../hooks/useAppKitWallet';
import '@aurora-is-near/intents-swap-widget/styles.css';
import { isHexColor } from '../../utils/is-hex-color';

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

interface WidgetProps {
  config?: Partial<WidgetConfig>;
}

const getValidThemeColor = (color: string): `#${string}` | undefined => {
  return isHexColor(color) ? color : undefined;
};

export function Widget({ config }: WidgetProps) {
  const { providers, address: walletAddress } = useAppKitWallet();

  const appBalanceMode = walletAddress ? 'with-balance' : 'all';
  const showAppBalance = true;
  const { state } = useCreator();
  const [_makeTransferArgs, setMakeTransferArgs] =
    useState<MakeTransferArgs | null>(null);

  const [successfulTransactionDetails, setSuccessfulTransactionDetails] =
    useState<{
      hash: string;
      transactionLink: string;
    } | null>(null);

  const defaultConfig = useMemo(
    () =>
      ({
        appName: 'Widget Creator',
        connectedWallets: { default: walletAddress },
        intentsAccountType: 'near',
        chainsFilter: {
          target: {
            intents: showAppBalance ? 'all' : 'none',
            external: 'all',
          },
          source: {
            intents: showAppBalance ? appBalanceMode : 'none',
            external: walletAddress ? 'wallet-supported' : 'all',
          },
        },
        allowedTargetChainsList: ['near'] as const,
        alchemyApiKey: ALCHEMY_API_KEY,
        allowedChainsList:
          state.selectedNetworks.length > 0
            ? state.selectedNetworks
            : undefined,
        allowedTokensList:
          state.selectedTokenSymbols.length > 0
            ? state.selectedTokenSymbols
            : undefined,
        // showIntentTokens:
        // appFees
        ...config,
      }) as WidgetConfig,
    [config, state.selectedNetworks],
  );

  const handleMakeTransfer = (args: MakeTransferArgs) => {
    setMakeTransferArgs(args);
  };

  const resetState = () => {
    setSuccessfulTransactionDetails(null);
    setMakeTransferArgs(null);
  };

  if (successfulTransactionDetails) {
    return (
      <WidgetContainer>
        <SuccessScreen
          hash={successfulTransactionDetails.hash}
          transactionLink={successfulTransactionDetails.transactionLink}
          message="Your swap has been successfully completed!"
        />
        <Button
          variant="primary"
          size="lg"
          onClick={resetState}
          className="mt-4">
          Go back
        </Button>
      </WidgetContainer>
    );
  }

  const getColorScheme = () => {
    if (state.defaultMode === 'auto') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    return state.defaultMode;
  };

  const colorScheme = getColorScheme();

  return (
    <WidgetConfigProvider
      config={defaultConfig}
      theme={{
        primaryColor: getValidThemeColor(state.primaryColor),
        surfaceColor: getValidThemeColor(state.surfaceColor),
        backgroundColor: getValidThemeColor(state.backgroundColor),
        colorScheme: colorScheme ?? 'dark',
      }}>
      <WidgetSwap providers={providers} makeTransfer={handleMakeTransfer} />
    </WidgetConfigProvider>
  );
}
