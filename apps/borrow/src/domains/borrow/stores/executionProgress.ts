import type {
  Execution,
  ExecutionStatus,
} from '@aurora-is-near/intents-connect';

/**
 * What this browser session saw happen to an execution it created or
 * watched: whether the wallet broadcast its deposit. The API's status can't
 * tell: `DEPOSIT_PENDING` stays until the deposit is seen on chain, long
 * after the wallet sent it. A record without a sent deposit is enough to
 * judge an execution abandoned (`isOngoingExecution`).
 *
 * Kept in memory only, across remounts but not reloads. After a reload an
 * execution is judged by the API alone (`isOngoingExecution`).
 */
export type ExecutionProgress = {
  depositSent: boolean;
};

const progress = new Map<string, ExecutionProgress>();

const keyOf = (wallet: string, executionId: string) =>
  `${wallet.startsWith('0x') ? wallet.toLowerCase() : wallet}:${executionId}`;

export const progressOf = (
  wallet: string | undefined,
  executionId: string,
): ExecutionProgress | undefined =>
  wallet === undefined ? undefined : progress.get(keyOf(wallet, executionId));

const update = (
  wallet: string | undefined,
  executionId: string,
  values: Partial<ExecutionProgress>,
) => {
  if (wallet === undefined) {
    return;
  }

  const key = keyOf(wallet, executionId);

  progress.set(key, {
    depositSent: false,
    ...progress.get(key),
    ...values,
  });
};

/** The execution was created here and is not signed yet. */
export const markCreated = (wallet: string | undefined, executionId: string) =>
  update(wallet, executionId, {});

export const markDepositSent = (
  wallet: string | undefined,
  executionId: string,
) => update(wallet, executionId, { depositSent: true });

/** The execution is over or deleted: nothing about it is needed any more. */
export const forgetProgress = (
  wallet: string | undefined,
  executionId: string,
) => {
  if (wallet !== undefined) {
    progress.delete(keyOf(wallet, executionId));
  }
};

/** For tests. */
export const clearAllProgress = () => progress.clear();

/** Before the deposit was seen on chain: it may still have to be sent. */
export const AWAITING_FUNDS: ReadonlySet<ExecutionStatus> = new Set([
  'CREATED',
  'DEPOSIT_PENDING',
]);

/**
 * Whether an open execution is on its way and must be waited for, rather
 * than abandoned (cancelled and replaced by the next borrow):
 * - its deposit was seen (any status past `DEPOSIT_PENDING`), or this
 *   session saw the wallet send it: ongoing;
 * - created here and its deposit not sent, as this session saw: abandoned,
 *   signed or not, whatever its status reads;
 * - unsigned by the API's `messageSigned`: abandoned;
 * - signed, and this session knows nothing more (a reload): its deposit
 *   may be on its way, so it is treated as ongoing.
 */
export const isOngoingExecution = (
  execution: Pick<Execution, 'id' | 'status'> & {
    details?: Pick<Execution['details'], 'messageSigned'>;
  },
  known: ExecutionProgress | undefined,
): boolean => {
  if (!AWAITING_FUNDS.has(execution.status) || known?.depositSent === true) {
    return true;
  }

  return known === undefined && execution.details?.messageSigned === true;
};
