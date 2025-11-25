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

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

interface WidgetProps {
  config?: Partial<WidgetConfig>;
}

export function Widget({ config }: WidgetProps) {
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
        ...config,
      }) as WidgetConfig,
    [config],
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
      <WidgetContainer isFullPage>
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

  return (
    <WidgetConfigProvider config={defaultConfig}>
      <WidgetSwap
        isFullPage
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
