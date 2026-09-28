import {
  Card,
  Skeleton,
  TinyNumber,
} from '@aurora-is-near/intents-swap-widget';
import type { Phase } from '@aurora-is-near/intents-connect';

import { AddressRow } from '../../../components/AddressRow';
import { PUSD_DECIMALS, USDC_DECIMALS } from '../constants';
import { useIntermediaryBalances } from '../hooks/useIntermediaryBalances';

const Row = ({
  label,
  value,
  decimals,
}: {
  label: string;
  value: string;
  decimals: number;
}) => (
  <div className="flex items-center justify-between gap-sw-md">
    <span className="text-sw-body-md text-sw-gray-400">{label}</span>
    <span className="text-sw-label-md text-sw-gray-100">
      <TinyNumber value={value} decimals={decimals} />
    </span>
  </div>
);

export const IntermediaryCard = ({ phase }: { phase: Phase }) => {
  const { data, error, isLoading } = useIntermediaryBalances(phase);

  return (
    <Card className="flex flex-col gap-sw-lg">
      <div className="flex flex-col gap-sw-xxs">
        <span className="text-sw-label-md text-sw-gray-50">
          Intents Connect account
        </span>
        <span className="text-sw-body-sm text-sw-gray-400">
          Runs the deposit on Polygon. Usually empty between deposits.
        </span>
      </div>

      {isLoading && <Skeleton height={56} />}

      {error && (
        <span className="text-sw-body-sm text-sw-status-error">
          {error.message}
        </span>
      )}

      {data && (
        <>
          <AddressRow label="Address" address={data.address} />
          <Row label="USDC" value={data.usdc} decimals={USDC_DECIMALS} />
          <Row label="pUSD" value={data.pusd} decimals={PUSD_DECIMALS} />
        </>
      )}
    </Card>
  );
};
