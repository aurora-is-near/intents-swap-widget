import type { ReactElement } from 'react';

import { useExecution } from '@aurora-is-near/intents-connect/react';

import { Layout } from '../../shared/components/Layout';
import { PositionsList } from './PositionsList';
import { ALCHEMY_API_KEY } from '../../shared/config';
import { DEST_TOKEN } from '../constants';
import { buildHydrexPlan } from '../plan';

export const HydrexTab = ({
  HeaderComponent,
  onBusyChange,
}: {
  HeaderComponent: ReactElement;
  onBusyChange: (isBusy: boolean) => void;
}) => {
  // Owned here, not inside Layout, so the positions panel below reads the very
  // same runner the card drives. Calling useExecution() again would build a
  // second runner whose phase never leaves idle.
  const exec = useExecution();

  return (
    <>
      <Layout
        exec={exec}
        HeaderComponent={HeaderComponent}
        alchemyApiKey={ALCHEMY_API_KEY}
        buildPlan={buildHydrexPlan}
        destinationToken={DEST_TOKEN}
        submitLabel="Deposit into cbETH/WETH"
        successMessage="Position minted to your wallet"
        onBusyChange={onBusyChange}
      />

      <PositionsList phase={exec.phase} />
    </>
  );
};
