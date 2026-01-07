import { useState } from 'react';
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
import { useWidgetConfig } from '../../hooks/useWidgetConfig';

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

interface WidgetProps {
  config?: Partial<WidgetConfig>;
}

export function Widget({ config }: WidgetProps) {
  const { providers } = useAppKitWallet();
  const { state } = useCreator();
  const [_makeTransferArgs, setMakeTransferArgs] =
    useState<MakeTransferArgs | null>(null);

  const [successfulTransactionDetails, setSuccessfulTransactionDetails] =
    useState<{
      hash: string;
      transactionLink: string;
    } | null>(null);

  const { widgetConfig } = useWidgetConfig();

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
      config={{
        ...widgetConfig,
        alchemyApiKey: ALCHEMY_API_KEY,
      }}
      theme={{
        primaryColor: (state.primaryColor ?? '#D5B7FF') as `#${string}`,
        surfaceColor: (state.pageBackgroundColor ?? '#636D9B') as `#${string}`,
        colorScheme: colorScheme ?? 'dark',
      }}>
      <WidgetSwap providers={providers} makeTransfer={handleMakeTransfer} />
    </WidgetConfigProvider>
  );
}
