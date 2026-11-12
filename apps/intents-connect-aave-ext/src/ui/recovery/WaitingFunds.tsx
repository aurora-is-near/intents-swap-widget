import { useMemo } from 'react';
import {
  useIntermediaryBalance,
  useWalletExecutions,
} from '@aurora-is-near/intents-connect/react';

import { formatAmount } from '../assets/amounts';
import { chainLabel } from '../assets/tokens';
import type { DeliverableOption } from '../supply/options';
import { Button, Notice } from '../ui';

/** Funds waiting at the wallet's intermediary: what a recovery spends. */
export type Waiting = {
  option: DeliverableOption;
  /** In the token's smallest unit. */
  amount: string;
};

/** Failed supplies looked at, newest first: enough for a recent one. */
const MAX_CANDIDATES = 3;

/**
 * What the wallet's intermediary holds of `option`'s token, when it holds
 * anything. That account acts for this wallet on the destination chain, and
 * only this wallet can move what it holds.
 */
const useWaitingAmount = (option: DeliverableOption) => {
  const { balance } = useIntermediaryBalance({
    destination: {
      chain: option.chain,
      assetId: option.destinationAsset,
      tokenAddress: option.tokenAddress,
    },
    refreshIntervalMs: 0,
  });

  return balance && BigInt(balance) > 0n ? balance : undefined;
};

/**
 * Funds of `option`'s token waiting for this wallet, and a way to supply
 * them (`onSupply`; leave it out to only say where they are). Renders
 * nothing while nothing waits.
 */
export const WaitingNotice = ({
  option,
  dappName,
  onSupply,
}: {
  option: DeliverableOption;
  dappName: string;
  onSupply?: (waiting: Waiting) => void;
}) => {
  const amount = useWaitingAmount(option);

  if (!amount) {
    return null;
  }

  return (
    <Notice tone="info">
      <p className="font-medium">
        {formatAmount(amount, option.decimals)} {option.symbol} is waiting on{' '}
        {chainLabel(option.chain)}
      </p>
      <p className="mt-1 text-text-secondary">
        A supply&apos;s last step didn&apos;t go through, so the funds stayed
        with this wallet&apos;s Aurora account. Only this wallet can move them.
      </p>
      {onSupply ? (
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => onSupply({ option, amount })}>
          Supply it to {dappName}
        </Button>
      ) : null}
    </Notice>
  );
};

/**
 * Funds a failed supply left behind: for each of the wallet's executions
 * whose last step failed (`OPERATION_FAILED`) into one of `options`, what
 * still waits. The balance decides, so funds already supplied show nothing.
 */
export const FailedSupplies = ({
  options,
  dappName,
  onSupply,
}: {
  options: readonly DeliverableOption[];
  dappName: string;
  onSupply?: (waiting: Waiting) => void;
}) => {
  const failed = useWalletExecutions({
    status: ['OPERATION_FAILED'],
    refreshIntervalMs: 0,
  });

  const candidates = useMemo(() => {
    const assets = new Set(
      failed.executions.map((execution) => execution.quote.destinationAsset),
    );

    return options
      .filter((option) => assets.has(option.destinationAsset))
      .slice(0, MAX_CANDIDATES);
  }, [failed.executions, options]);

  return (
    <>
      {candidates.map((option) => (
        <WaitingNotice
          key={option.id}
          option={option}
          dappName={dappName}
          onSupply={onSupply}
        />
      ))}
    </>
  );
};
