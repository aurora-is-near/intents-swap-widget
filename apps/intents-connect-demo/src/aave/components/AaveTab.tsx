import type { ReactElement } from 'react';

import { useExecution } from '@aurora-is-near/intents-connect/react';
import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';

import { Layout } from '../../shared/components/Layout';
import { ALCHEMY_API_KEY } from '../../shared/config';
import { DEST_TOKEN } from '../constants';
import { buildAavePlan } from '../plan';
import { PositionsList } from './PositionsList';

export const AaveTab = ({
  HeaderComponent,
  onBusyChange,
}: {
  HeaderComponent: ReactElement;
  onBusyChange: (isBusy: boolean) => void;
}) => {
  const exec = useExecution();
  const { family } = useIntentsConnectWallet();

  return (
    <>
      <Layout
        exec={exec}
        HeaderComponent={HeaderComponent}
        alchemyApiKey={ALCHEMY_API_KEY}
        buildPlan={buildAavePlan}
        destinationToken={DEST_TOKEN}
        submitLabel="Supply USDC on Monad"
        successMessage="USDC supplied to your Aave position on Monad"
        isReady={family === 'evm'}
        FieldsComponent={
          <p className="text-sw-body-sm text-sw-gray-400 px-sw-md">
            Your deposit is converted to USDC and supplied to Aave on Monad.
            Connect an EVM wallet to receive the position.
          </p>
        }
        onBusyChange={onBusyChange}
      />

      <PositionsList phase={exec.phase} />
    </>
  );
};
