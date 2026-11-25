import type {
  Execution,
  ExecutionStatus,
} from '@aurora-is-near/intents-connect';

/**
 * What this browser session saw happen to an execution it created: whether the user
 * signed its intent and whether the wallet broadcast its deposit. The API's
 * status can't tell either: an unsigned execution may already read
 * `DEPOSIT_PENDING`, and `DEPOSIT_PENDING` stays until the deposit is seen
 * on chain, long after the wallet sent it.
 *
 * Kept in memory only, across remounts but not reloads. After a reload an
 * execution is judged by the API alone (`isOngoingExecution`).
 */
export type ExecutionProgress = {
  signed: boolean;
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
    signed: false,
    depositSent: false,
    ...progress.get(key),
    ...values,
  });
};

/** The execution was created here and is not signed yet. */
export const markCreated = (wallet: string | undefined, executionId: string) =>
  update(wallet, executionId, {});

/**
 * The execution created here was signed. Only an execution this session
 * created (`markCreated`) is updated: one it merely watches (restored, or
 * the previous borrow) must stay unknown, or "signed, deposit not sent"
 * would make a deposit that may be on its way look abandoned
 * (`isOngoingExecution`).
 */
export const markSigned = (wallet: string | undefined, executionId: string) => {
  if (progressOf(wallet, executionId)) {
    update(wallet, executionId, { signed: true });
  }
};

export const markDepositSent = (
  wallet: string | undefined,
  executionId: string,
) => update(wallet, executionId, { signed: true, depositSent: true });

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
const AWAITING_FUNDS: ReadonlySet<ExecutionStatus> = new Set([
  'CREATED',
  'DEPOSIT_PENDING',
]);

/**
 * Whether an open execution is on its way and must be waited for, rather
 * than abandoned (cancelled and replaced by the next borrow):
 * - its deposit was seen (any status past `DEPOSIT_PENDING`), or this
 *   session saw the wallet send it: ongoing;
 * - unsigned (by this session's record, or the API's `messageSigned`):
 *   abandoned, whatever its status reads;
 * - signed and its deposit not sent, as this session saw: abandoned;
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

  const signed =
    known?.signed === true || execution.details?.messageSigned === true;

  return signed && known === undefined;
};
