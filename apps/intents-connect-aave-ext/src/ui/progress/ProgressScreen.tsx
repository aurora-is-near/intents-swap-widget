import { type ReactNode, useState } from 'react';
import type { ExecutionPreview, Phase } from '@aurora-is-near/intents-connect';
import type {
  UseExecutionResult,
  UseIntentsConnectFlowResult,
} from '@aurora-is-near/intents-connect/react';

import { formatAmount } from '../assets/amounts';
import { chainLabel, explorerTxUrl } from '../assets/tokens';
import {
  Button,
  CheckIcon,
  CopyButton,
  cx,
  Notice,
  truncateMiddle,
  useNow,
} from '../ui';
import { describeFailure } from './describeFailure';
import type { SupplyRun } from './types';

const STEPS = ['Prepare', 'Sign', 'Deposit', 'Supply', 'Done'];

const PHASE_STEP: Partial<Record<Phase, number>> = {
  'resolving-identity': 0,
  planning: 0,
  creating: 0,
  'awaiting-signature': 1,
  submitting: 1,
  'awaiting-deposit': 2,
  settling: 3,
  success: 4,
};

/** The step a stopped execution got to, from what the server last said. */
const stoppedAt = ({
  status,
  hasSubmittedSignature,
  executionId,
}: Pick<
  UseExecutionResult,
  'status' | 'hasSubmittedSignature' | 'executionId'
>): number => {
  switch (status) {
    case 'OPERATION_PENDING':
    case 'OPERATION_PROCESSING':
    case 'OPERATION_FAILED':
      return 3;
    case 'DEPOSIT_PENDING':
    case 'DEPOSIT_PROCESSING':
    case 'DEPOSIT_FAILED':
    case 'EXPIRED':
      return 2;
    default:
      if (hasSubmittedSignature) {
        return 2;
      }

      return executionId ? 1 : 0;
  }
};

/**
 * Segmented progress; the step a run stopped at turns red. A found run not
 * resumed yet (`waitingAt`) sits at its step, not halted.
 */
const Stepper = ({
  exec,
  waitingAt,
}: {
  exec: UseExecutionResult;
  waitingAt?: number;
}) => {
  const live = PHASE_STEP[exec.phase];
  const current = waitingAt ?? live ?? stoppedAt(exec);
  const complete = exec.phase === 'success';
  const halted = waitingAt === undefined && live === undefined;

  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {STEPS.map((label, index) => {
        const done = index < current || complete;
        const active = index === current && !done;

        return (
          <li key={label} className="flex min-w-0 flex-col gap-1.5">
            <span
              className={cx(
                'h-1 rounded-full',
                done && 'bg-text-primary',
                active && !halted && 'animate-pulse bg-text-primary/45',
                active && halted && 'bg-danger',
                !done && !active && 'bg-black/8',
              )}
            />
            <span
              className={cx(
                'truncate text-xs',
                done || active ? 'text-text-secondary' : 'text-text-muted',
              )}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-text-secondary">{label}</dt>
    <dd className="flex min-w-0 items-center gap-0.5 text-right tabular-nums">
      {children}
    </dd>
  </div>
);

const TxLink = ({
  chain,
  hash,
  label,
}: {
  chain: string;
  hash: string;
  label: string;
}) => {
  const url = explorerTxUrl(chain, hash);

  return (
    <>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={hash}
          className="underline decoration-black/20 underline-offset-2 hover:decoration-black">
          {truncateMiddle(hash, 6, 4)}
        </a>
      ) : (
        <span title={hash}>{truncateMiddle(hash, 6, 4)}</span>
      )}
      <CopyButton value={hash} label={label} />
    </>
  );
};

/** Headline for a live phase: what the user should be doing right now. */
const LIVE_COPY: Partial<Record<Phase, [string, string?]>> = {
  idle: ['Preparing…'],
  'resolving-identity': ['Preparing…'],
  planning: ['Preparing…'],
  creating: ['Preparing…'],
  'awaiting-signature': [
    'Sign in your wallet',
    'A message authorising the supply. It moves no funds.',
  ],
  submitting: ['Submitting…'],
  'awaiting-deposit': [
    'Confirm the transfer in your wallet',
    'It sends your deposit to the bridge.',
  ],
  settling: ['Bridging and supplying…', 'You can close this: it carries on.'],
};

/**
 * A running (or finished) supply: where it is, what it moves, and the way
 * out of every state that needs the user.
 */
export const ProgressScreen = ({
  flow,
  run,
  dappName,
  destinationTitle,
  onAttach,
  onSwitchWallet,
  onDone,
}: {
  flow: UseIntentsConnectFlowResult<ExecutionPreview>;
  run: SupplyRun;
  dappName: string;
  destinationTitle: string;
  /** The user resumed or cancelled a found run: it is no longer waiting. */
  onAttach: () => void;
  /** Leaves a found run waiting and goes to the wallet list. */
  onSwitchWallet: () => void;
  /** Leaves a finished (or never-started) run. */
  onDone: () => void;
}) => {
  const { exec } = flow;
  const { origin, option, resumed } = run;
  // Older executions may leave quote fields out: show only what is there.
  const amount = (value: string | undefined, decimals: number) =>
    value ? formatAmount(value, decimals) : undefined;

  const waiting = resumed?.waiting ? resumed : undefined;
  const executionId = exec.executionId ?? resumed?.id;
  const failure = flow.preparationError ?? exec.error;
  const described = failure
    ? describeFailure(failure, origin?.symbol ?? 'funds')
    : undefined;

  const quote = exec.execution?.quote ?? run.quoted.quote;
  const fee =
    exec.networkFee ??
    exec.execution?.details.networkFee ??
    run.quoted.details.networkFee;

  const supplyTx = exec.execution?.transaction?.evmTxHash;
  const estimated = Number(exec.execution?.details.estimatedTime);
  const settling = exec.phase === 'settling';
  const now = useNow(settling);
  const [settlingSince, setSettlingSince] = useState<number>();

  if (settling && settlingSince === undefined) {
    setSettlingSince(Date.now());
  }

  const finished =
    exec.phase === 'success' ||
    exec.phase === 'cancelled' ||
    (exec.phase === 'failed' && flow.state === 'IDLE' && !flow.canCancel) ||
    (!!flow.preparationError && !exec.executionId);

  let headline: ReactNode;

  if (waiting) {
    headline = (
      <Notice tone="warning">
        <p className="font-medium">
          {waiting.needs === 'signature'
            ? 'A supply from this wallet was never signed'
            : 'A supply from this wallet is waiting for its deposit'}
        </p>
        <p className="mt-1 text-text-secondary">
          {waiting.needs === 'signature'
            ? 'Resume to sign it in your wallet, or cancel it to start over.'
            : 'Resume to follow it (and see where to send the deposit), or cancel it to start over.'}
        </p>
      </Notice>
    );
  } else if (exec.phase === 'success') {
    headline = (
      <Notice tone="info">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cta text-cta-text">
            <CheckIcon size={20} />
          </span>
          <p className="font-medium">Supplied to {destinationTitle}</p>
          <p className="text-text-secondary">
            {quote.minAmountOut
              ? `At least ${amount(quote.minAmountOut, option.decimals)} ${option.symbol}. `
              : null}
            It shows up in Your supplies on {dappName} within a minute.
          </p>
        </div>
      </Notice>
    );
  } else if (flow.state === 'IN_FLIGHT') {
    headline = (
      <Notice tone="warning">
        <p className="font-medium">
          A supply from this wallet is already running
        </p>
        <p className="mt-1 text-text-secondary">
          Resume it to follow it here, or cancel it to start a new one.
        </p>
      </Notice>
    );
  } else if (flow.state === 'FAILED') {
    headline = (
      <Notice tone="warning">
        <p className="font-medium">The transfer didn&apos;t go through</p>
        <p className="mt-1 text-text-secondary">
          {exec.recovery?.kind === 'retry-transfer' && exec.recovery.cause
            ? describeFailure(exec.recovery.cause, origin?.symbol ?? 'funds')
                .title
            : 'Retry it, or cancel the supply.'}
        </p>
      </Notice>
    );
  } else if (described) {
    headline = (
      <Notice tone="warning">
        <p className="font-medium">
          {exec.phase === 'cancelled' ? 'Cancelled' : described.title}
        </p>
        {described.detail ? (
          <p className="mt-1 break-words text-text-secondary">
            {described.detail}
          </p>
        ) : null}
      </Notice>
    );
  } else if (exec.phase === 'cancelled') {
    headline = (
      <Notice tone="info">
        <p className="font-medium">Cancelled</p>
        <p className="mt-1 text-text-secondary">Nothing was supplied.</p>
      </Notice>
    );
  } else {
    const [title, detail] = LIVE_COPY[exec.phase] ?? ['Working…'];
    const left =
      settling && settlingSince !== undefined && Number.isFinite(estimated)
        ? Math.max(0, Math.round(estimated - (now - settlingSince) / 1000))
        : undefined;

    headline = (
      <div>
        <p className="font-medium">{title}</p>
        {detail !== undefined || left !== undefined ? (
          <p className="mt-0.5 text-text-secondary">
            {left !== undefined && left > 0 ? `About ${left} s left. ` : null}
            {detail}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Stepper
        exec={exec}
        waitingAt={waiting && (waiting.needs === 'signature' ? 1 : 2)}
      />

      {headline}

      <dl className="flex flex-col gap-1.5 rounded-xl bg-surface-raised p-3 shadow-box">
        {origin && quote.amountIn ? (
          <Detail label="You send">
            {amount(quote.amountIn, origin.decimals)} {origin.symbol}{' '}
            <span className="text-text-muted">
              on {chainLabel(origin.blockchain)}
            </span>
          </Detail>
        ) : null}
        {quote.minAmountOut ? (
          <Detail label="You supply at least">
            {amount(quote.minAmountOut, option.decimals)} {option.symbol}
          </Detail>
        ) : (
          <Detail label="Supplying">{option.symbol}</Detail>
        )}
        {fee ? (
          <Detail label="Network fee">
            {amount(fee, option.decimals)} {option.symbol}
          </Detail>
        ) : null}
        {exec.depositTxHash ? (
          <Detail label="Deposit">
            <TxLink
              chain={origin?.blockchain ?? ''}
              hash={exec.depositTxHash}
              label="deposit transaction"
            />
          </Detail>
        ) : null}
        {supplyTx ? (
          <Detail label="Supply">
            <TxLink
              chain={option.chain}
              hash={supplyTx}
              label="supply transaction"
            />
          </Detail>
        ) : null}
        {executionId ? (
          <Detail label="Execution">
            <span title={executionId}>{truncateMiddle(executionId, 6, 4)}</span>
            <CopyButton value={executionId} label="execution id" />
          </Detail>
        ) : null}
      </dl>

      {flow.needsExternalDeposit && exec.depositAddress ? (
        <Notice tone="info">
          <p className="font-medium">Send the deposit yourself</p>
          <p className="mt-1 text-text-secondary">
            {origin && quote.amountIn
              ? `Exactly ${amount(quote.amountIn, origin.decimals)} ${origin.symbol} on ${chainLabel(origin.blockchain)} to:`
              : 'The amount you were quoted, to:'}
          </p>
          <p className="mt-1 flex items-center gap-1 break-all font-medium">
            {exec.depositAddress}
            <CopyButton value={exec.depositAddress} label="deposit address" />
          </p>
          {exec.depositMemo ? (
            <>
              <p className="mt-2 text-text-secondary">With this memo:</p>
              <p className="mt-1 flex items-center gap-1 break-all font-medium">
                {exec.depositMemo}
                <CopyButton value={exec.depositMemo} label="memo" />
              </p>
              <p className="mt-1 text-danger">
                The memo is required: a deposit without it can&apos;t be matched
                to this supply.
              </p>
            </>
          ) : null}
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2">
        {waiting ? (
          <>
            <Button
              variant="primary"
              onClick={() => {
                onAttach();
                flow.exec.resume(waiting.id).catch(() => undefined);
              }}>
              Resume
            </Button>
            <Button
              variant="secondary"
              className="h-12"
              onClick={() => {
                onAttach();
                flow.exec.cancel(waiting.id).catch(() => undefined);
              }}>
              Cancel the supply
            </Button>
            <Button
              variant="ghost"
              className="self-center px-2 py-1"
              onClick={onSwitchWallet}>
              Pay from another wallet
            </Button>
          </>
        ) : null}
        {described?.stillLive ? (
          <Button
            variant="primary"
            disabled={flow.isBusy}
            onClick={() => {
              flow.exec.resume(described.stillLive!).catch(() => undefined);
            }}>
            Keep following
          </Button>
        ) : null}
        {flow.state === 'IN_FLIGHT' ? (
          <Button
            variant="primary"
            disabled={flow.isBusy}
            onClick={() => {
              void flow.resume();
            }}>
            Resume
          </Button>
        ) : null}
        {flow.state === 'FAILED' ? (
          <Button
            variant="primary"
            disabled={flow.isBusy}
            onClick={() => {
              void flow.retryDeposit();
            }}>
            Retry transfer
          </Button>
        ) : null}
        {flow.canCancel ? (
          <Button
            variant="secondary"
            className="h-12"
            disabled={exec.isCancelling}
            onClick={() => {
              void flow.cancel();
            }}>
            {exec.isCancelling ? 'Sign to cancel…' : 'Cancel the supply'}
          </Button>
        ) : null}
        {finished ? (
          <Button variant="primary" onClick={onDone}>
            {exec.phase === 'success' ? 'Done' : 'Back to the form'}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
