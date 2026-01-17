import { useMemo, useState } from 'react';
import {
  Banner,
  Button,
  SuccessScreen,
  Widget,
  WidgetConfigProvider,
  WidgetContainer,
} from '@aurora-is-near/intents-swap-widget';
import { noop } from '@aurora-is-near/intents-swap-widget/utils';
import { useCreator } from '../../hooks/useCreatorConfig';
import '@aurora-is-near/intents-swap-widget/styles.css';
import { useWidgetConfig } from '../../hooks/useWidgetConfig';
import { useThemeConfig } from '../../hooks/useThemeConfig';

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

export function WidgetContent() {
  const { state } = useCreator();

  const [successfulTransactionDetails, setSuccessfulTransactionDetails] =
    useState<{
      hash: string;
      transactionLink: string;
    } | null>(null);

  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();

  const exampleBanner = useMemo(():
    | {
        variant: 'success' | 'warn' | 'error';
        label: string;
      }
    | undefined => {
    if (state.openThemeColorPickerId === 'successColor') {
      return { variant: 'success', label: 'success' };
    }

    if (state.openThemeColorPickerId === 'warningColor') {
      return { variant: 'warn', label: 'warning' };
    }

    if (state.openThemeColorPickerId === 'errorColor') {
      return { variant: 'error', label: 'error' };
    }
  }, [state.openThemeColorPickerId]);

  const resetState = () => {
    setSuccessfulTransactionDetails(null);
  };

  if (successfulTransactionDetails) {
    return (
      <WidgetContainer>
        <SuccessScreen
          title="Swap successful"
          hash={successfulTransactionDetails.hash}
          transactionLink={successfulTransactionDetails.transactionLink}
          message="Your swap has been successfully completed!"
          onMsg={noop}
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
    <WidgetConfigProvider
      config={{
        ...widgetConfig,
        alchemyApiKey: ALCHEMY_API_KEY,
      }}
      theme={themeConfig}>
      <Widget />
      {exampleBanner && (
        <Banner
          variant={exampleBanner.variant}
          message={`This is an example ${exampleBanner.label} message`}
          className="mt-csw-2xl"
        />
      )}
    </WidgetConfigProvider>
  );
}
