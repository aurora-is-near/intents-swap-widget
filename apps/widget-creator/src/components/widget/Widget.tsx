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

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

interface WidgetProps {
  config?: Partial<WidgetConfig>;
}

export function Widget({ config }: WidgetProps) {
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
        primaryColor: (state.primaryColor ?? '#D5B7FF') as `#${string}`,
        surfaceColor: (state.pageBackgroundColor ?? '#24262D') as `#${string}`,
        colorScheme: colorScheme ?? 'dark',
      }}>
      <WidgetSwap
        makeTransfer={handleMakeTransfer}
        providers={
          {
            // Add providers as needed
          }
        }
      />
    </WidgetConfigProvider>
  );
}
