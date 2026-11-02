import type { Execution } from '@aurora-is-near/intents-connect';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { USDC_DECIMALS } from '../apps/polymarket/constants';
import { findIntegrationByIntent } from '../apps/registry';
import type { Integration } from '../apps/registry';
import { formatTokenAmount } from '../screens/transfer/summary';
import { formatAmount } from '../utils';
import type { ActivityStatus } from './activity';

/** A deposit into an app (Intents Connect execution), as Activity lists it. */
export type AppActivityItem = {
  id: string;
  kind: 'app';
  app: Integration | undefined;
  status: ActivityStatus;
  /** Expired executions still complete if the deposit arrives late. */
  isExpired: boolean;
  createdAt: Date;
  from: { token: Token | undefined; amount: string };
  /** What the app receives (≈ the post-fee bridged amount). */
  to: { symbol: string; amount: string };
  /** In the bridged asset (USDC). */
  fee: string;
  execution: Execution;
};

const STATUS: Record<Execution['status'], ActivityStatus> = {
  CREATED: 'pending',
  DEPOSIT_PENDING: 'pending',
  DEPOSIT_PROCESSING: 'pending',
  OPERATION_PENDING: 'pending',
  OPERATION_PROCESSING: 'pending',
  SUCCESS: 'success',
  DEPOSIT_FAILED: 'failed',
  OPERATION_FAILED: 'failed',
  EXPIRED: 'pending',
};

const usd6 = (atomic: string | undefined) =>
  atomic ? formatAmount(Number(atomic) / 10 ** USDC_DECIMALS) : '';

export const toAppActivityItem = (
  tokens: Token[],
  execution: Execution,
): AppActivityItem => {
  const token = tokens.find(
    (item) => !item.isIntent && item.assetId === execution.quote.originAsset,
  );

  const app = findIntegrationByIntent(execution.metadata?.intent);

  return {
    id: execution.id,
    kind: 'app',
    app,
    status: STATUS[execution.status],
    isExpired: execution.status === 'EXPIRED',
    createdAt: new Date(execution.createdAt ?? Date.now()),
    from: {
      token,
      amount: token ? formatTokenAmount(execution.quote.amount, token) : '',
    },
    to: {
      symbol: app?.arrivesAs ?? 'USDC',
      amount: usd6(execution.quote.minAmountOut),
    },
    fee: usd6(execution.details.networkFee),
    execution,
  };
};

/**
 * The app's name, else what the execution says about itself (other
 * Intents Connect clients tag it differently), else "Other app".
 */
export const appName = (item: AppActivityItem) => {
  const metadata = item.execution.metadata ?? {};
  const label = [metadata.title, metadata.venue].find(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  return item.app?.name ?? label ?? 'Other app';
};
