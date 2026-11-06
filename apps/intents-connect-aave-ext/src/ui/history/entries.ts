import type { Execution } from '@aurora-is-near/intents-connect';

import { hasIntent, needsOf } from '../progress/runOf';

/** A wallet whose runs are listed, as the page shows it. */
export type HistoryWallet = {
  /** As its connector reports it: what its runs are filed under. */
  address: string;
  name: string;
  icon?: string;
  /** The wallet the modal pays from. */
  active: boolean;
};

export type HistoryLabel =
  | 'supplied'
  | 'supplied-waiting'
  | 'needs-you'
  | 'in-progress'
  | 'failed'
  | 'expired';

export type HistoryEntry<TWallet extends HistoryWallet = HistoryWallet> = {
  execution: Execution;
  /** The wallet it was paid from. */
  wallet: TWallet;
  label: HistoryLabel;
  /** Spent what waited at the intermediary: no quote, no origin. */
  stepsOnly: boolean;
};

/** One wallet's answer. */
type HistorySource<TWallet extends HistoryWallet = HistoryWallet> = {
  wallet: TWallet;
  executions: readonly Execution[];
};

/** The newest this many are listed. */
export const HISTORY_LIMIT = 50;

/**
 * One wallet per address (MetaMask and Rabby can share one account): the
 * active wallet's name when it holds the address, else the first's. Letter
 * case is kept: a wallet always reports its address one way, and that is
 * the spelling its runs are filed under.
 */
export const uniqueWallets = <TWallet extends HistoryWallet>(
  wallets: readonly TWallet[],
): TWallet[] => {
  const byAddress = new Map<string, TWallet>();

  wallets.forEach((wallet) => {
    const seen = byAddress.get(wallet.address);

    if (!seen || (wallet.active && !seen.active)) {
      byAddress.set(wallet.address, wallet);
    }
  });

  return [...byAddress.values()];
};

/** A steps-only run (`executionMode`; older deployments mark the metadata). */
const isStepsOnly = (execution: Execution) =>
  execution.executionMode === 'steps_only' ||
  execution.metadata?.intentsConnectFlow === 'steps-only';

export const labelOf = (execution: Execution): HistoryLabel => {
  switch (execution.status) {
    case 'SUCCESS':
      return isStepsOnly(execution) ? 'supplied-waiting' : 'supplied';
    case 'DEPOSIT_FAILED':
    case 'OPERATION_FAILED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    default:
      return needsOf(execution) ? 'needs-you' : 'in-progress';
  }
};

/** Expired before it was signed: a quote the user walked away from. */
const abandoned = (execution: Execution) =>
  execution.status === 'EXPIRED' && execution.details?.messageSigned !== true;

const timeOf = ({ createdAt }: Execution) => Date.parse(createdAt ?? '') || 0;

/**
 * Every wallet's runs as one list: only the dApp's own (`intent`), each run
 * once (the active wallet's copy when two wallets list it), without
 * abandoned quotes, newest first (undated last), at most `HISTORY_LIMIT`.
 */
export const historyEntries = <TWallet extends HistoryWallet>(
  sources: readonly HistorySource<TWallet>[],
  intent: string,
): HistoryEntry<TWallet>[] => {
  const byId = new Map<string, { execution: Execution; wallet: TWallet }>();

  const ours = hasIntent(intent);

  sources.forEach(({ wallet, executions }) =>
    executions.forEach((execution) => {
      if (!ours(execution) || abandoned(execution)) {
        return;
      }

      const seen = byId.get(execution.id);

      if (!seen || (wallet.active && !seen.wallet.active)) {
        byId.set(execution.id, { execution, wallet });
      }
    }),
  );

  return [...byId.values()]
    .sort((a, b) => timeOf(b.execution) - timeOf(a.execution))
    .slice(0, HISTORY_LIMIT)
    .map(({ execution, wallet }) => ({
      execution,
      wallet,
      label: labelOf(execution),
      stepsOnly: isStepsOnly(execution),
    }));
};
