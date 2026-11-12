import type {
  BalanceToken,
  Execution,
  ExecutionStatus,
} from '@aurora-is-near/intents-connect';

import type { DeliverableOption } from '../supply/options';
import type { SupplyRun } from './types';

/** Still waiting on the user's funds. */
const AWAITING_FUNDS: readonly ExecutionStatus[] = [
  'CREATED',
  'DEPOSIT_PENDING',
];

/**
 * What resuming would prompt, by the runner's own rule: a signature while a
 * signing payload is offered and nothing says it was signed (whatever the
 * status reads), then the deposit while funds are awaited.
 */
export const needsOf = ({
  status,
  details,
}: Execution): 'signature' | 'deposit' | undefined => {
  if (details?.messageSigned !== true && details?.payload) {
    return 'signature';
  }

  return AWAITING_FUNDS.includes(status) ? 'deposit' : undefined;
};

/** Only the dApp's own runs, by the recipe's `intent`; all without one. */
export const hasIntent =
  (intent: string | undefined) =>
  (execution: Execution): boolean =>
    intent === undefined || execution.metadata?.intent === intent;

/**
 * A found execution as a run to show: what it paid with and the option it
 * supplies into (`options`' own, else one named from the token list).
 * `undefined` while the tokens can't name what it supplies: older runs don't
 * echo their origin, which can be missing, but the destination can't.
 */
export const runOf = (
  execution: Execution,
  {
    tokens,
    options,
    walletKey,
  }: {
    tokens: readonly BalanceToken[];
    options?: readonly DeliverableOption[];
    walletKey: string;
  },
): SupplyRun | undefined => {
  const { originAsset, destinationAsset } = execution.quote ?? {};
  const origin = tokens.find((token) => token.assetId === originAsset);
  const destination = tokens.find(
    (token) => token.assetId === destinationAsset,
  );

  if (!destination) {
    return undefined;
  }

  const needs = needsOf(execution);

  return {
    origin,
    option: options?.find(
      (option) => option.destinationAsset === destinationAsset,
    ) ?? {
      id: destination.assetId,
      symbol: destination.symbol,
      chain: destination.blockchain,
      // A native token is listed with an empty contract address.
      tokenAddress: destination.contractAddress
        ? destination.contractAddress
        : undefined,
      decimals: destination.decimals,
      destinationAsset: destination.assetId,
    },
    walletKey,
    quoted: execution,
    resumed: {
      id: execution.id,
      status: execution.status,
      waiting: needs !== undefined,
      needs,
    },
  };
};
