import { type ReactNode, useState } from 'react';
import type { ExecutionPreview, Phase } from '@aurora-is-near/intents-connect';
import type {
  UseExecutionResult,
  UseIntentsConnectFlowResult,
} from '@aurora-is-near/intents-connect/react';

import { formatAmount, fromAtomic } from '../assets/amounts';
import { AssetAmount, ChainName } from '../assets/AssetAmount';
import { chainLabel, explorerTxUrl } from '../assets/tokens';
import { exchangeNetwork } from '../transfer/networks';
import { type Politeness, Spoken } from '../a11y';
import {
  Button,
  CheckIcon,
  CloseIcon,
  CopyButton,
  ExternalIcon,
  Notice,
  truncateMiddle,
  useNow,
} from '../ui';
import { type Waiting, WaitingNotice } from '../recovery/WaitingFunds';
import { DepositPanel } from './DepositPanel';
import { StepBar } from './StepBar';
import { countdown, depositView } from './depositState';
import { describeFailure } from './describeFailure';
import { savedTransfer } from './transfers';
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
    <StepBar
      steps={STEPS}
      current={current}
      complete={complete}
      halted={halted}
    />
  );
};

export const Detail = ({
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

export const TxLink = ({
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
          className="inline-flex items-center gap-1 underline decoration-link-line underline-offset-2 hover:decoration-text-primary">
          <span className="sr-only">
            {label.charAt(0).toUpperCase() + label.slice(1)}{' '}
          </span>
          {truncateMiddle(hash, 6, 4)}
          <span className="sr-only"> (opens in a new tab)</span>
          <span className="text-text-muted">
            <ExternalIcon />
          </span>
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

/** A transfer's deposit step: the user sends it, not the wallet. */
const TRANSFER_DEPOSIT_COPY: [string, string] = [
  'Send your deposit',
  'From an exchange or any wallet, to the address below.',
];

/**
 * How to resume a run: a saved transfer never makes the wallet send the
 * deposit (an unsigned one would, after signing), and names its chain.
 */
const resumeOptions = (id: string | undefined) => {
  const saved = savedTransfer(id);

  return saved
    ? { depositViaWallet: false, originChain: saved.originChain }
    : undefined;
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
  onRecover,
  onStartOver,
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
  /** Supplies what a failed last step left at the intermediary. */
  onRecover?: (waiting: Waiting) => void;
  /** A transfer whose time ran out: pick what to send again. */
  onStartOver?: () => void;
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
  const awaitingTransfer = !!run.transfer && exec.phase === 'awaiting-deposit';
  const now = useNow(settling || awaitingTransfer);

  // A transfer: where to send it, until the deposit is seen or time is up.
  const deposit = run.transfer
    ? depositView({
        phase: exec.phase,
        status: exec.status,
        depositAddress: exec.depositAddress,
        deadline: exec.deadline ?? quote.deadline,
        now,
      })
    : undefined;

  const expired = deposit?.kind === 'expired';
  // The panel: the address while it waits for one, or the expired notice.
  const panelView =
    expired || (deposit?.kind === 'waiting' && exec.depositAddress)
      ? deposit
      : undefined;

  const [settlingSince, setSettlingSince] = useState<number>();

  if (settling && settlingSince === undefined) {
    setSettlingSince(Date.now());
  }

  const finished =
    exec.phase === 'success' ||
    exec.phase === 'cancelled' ||
    (exec.phase === 'failed' && flow.state === 'IDLE' && !flow.canCancel) ||
    (!!flow.preparationError && !exec.executionId);

  // An expired transfer offers Start over instead.
  const leave = finished && !expired;

  let headline: ReactNode;
  // The headline in words, for screen readers: read when it changes.
  let spoken: { text: string; politeness: Politeness } | undefined;

  if (waiting) {
    spoken = {
      text:
        waiting.needs === 'signature'
          ? 'A supply from this wallet was never signed'
          : 'A supply from this wallet is waiting for its deposit',
      politeness: 'polite',
    };
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
    spoken = { text: `Supplied to ${destinationTitle}`, politeness: 'polite' };
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
  } else if (expired) {
    // The deposit panel says it, over the SDK's "still processing".
    spoken = { text: 'The time to send has passed', politeness: 'assertive' };
    headline = null;
  } else if (flow.state === 'IN_FLIGHT') {
    spoken = {
      text: 'A supply from this wallet is already running',
      politeness: 'polite',
    };
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
    spoken = {
      text: "The transfer didn't go through",
      politeness: 'assertive',
    };
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
  } else if (exec.status === 'OPERATION_FAILED') {
    spoken = {
      text: `The supply to ${dappName} didn't go through`,
      politeness: 'assertive',
    };
    headline = (
      <Notice tone="warning">
        <p className="font-medium">
          The supply to {dappName} didn&apos;t go through
        </p>
        <p className="mt-1 text-text-secondary">
          Your funds were bridged, but the last step failed: the reserve may
          have reached its supply cap. What reached {chainLabel(option.chain)}{' '}
          stays with this wallet&apos;s Aurora account.
        </p>
      </Notice>
    );
  } else if (exec.phase === 'cancelled') {
    // Whether funds moved: a deposit the wallet sent shows its transaction;
    // a transfer's, the user may or may not have sent.
    let moved = 'Nothing was supplied, and your funds never left your wallet.';

    if (exec.depositTxHash) {
      moved =
        'Nothing was supplied, but the deposit above was already sent. Keep its transaction if you contact support.';
    } else if (run.transfer) {
      moved =
        "Nothing was supplied. If you didn't send the deposit, your funds never left your wallet.";
    }

    spoken = { text: 'Cancelled', politeness: 'polite' };
    headline = (
      <Notice tone="info">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-track text-text-secondary">
            <CloseIcon size={18} />
          </span>
          <p className="font-medium">Cancelled</p>
          <p className="text-text-secondary">{moved}</p>
        </div>
      </Notice>
    );
  } else if (described) {
    spoken = { text: described.title, politeness: 'assertive' };
    headline = (
      <Notice tone="warning">
        <p className="font-medium">{described.title}</p>
        {described.detail ? (
          <p className="mt-1 break-words text-text-secondary">
            {described.detail}
          </p>
        ) : null}
      </Notice>
    );
  } else {
    const [baseTitle, detail] = (awaitingTransfer
      ? TRANSFER_DEPOSIT_COPY
      : LIVE_COPY[exec.phase]) ?? ['Working…'];

    // The title without its ticking countdown: read once per phase.
    spoken = { text: baseTitle, politeness: 'polite' };

    // A transfer's window counts down in its title.
    const title =
      awaitingTransfer &&
      deposit?.kind === 'waiting' &&
      deposit.msLeft !== undefined
        ? `${baseTitle} within ${countdown(deposit.msLeft)}`
        : baseTitle;

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
      <Spoken text={spoken?.text} politeness={spoken?.politeness} />
      <Stepper
        exec={exec}
        waitingAt={waiting && (waiting.needs === 'signature' ? 1 : 2)}
      />

      {headline}

      {/* Where to send comes first; what it does follows. */}
      {panelView && origin ? (
        <DepositPanel
          view={panelView}
          address={exec.depositAddress ?? ''}
          memo={exec.depositMemo}
          amount={fromAtomic(quote.amount || quote.amountIn, origin.decimals)}
          symbol={origin.symbol}
          chain={origin.blockchain}
          network={exchangeNetwork(origin.blockchain, chainLabel)}
          contractAddress={origin.contractAddress}
          onStartOver={onStartOver}
          startingOver={exec.isCancelling}
        />
      ) : null}

      <dl className="flex flex-col gap-1.5 rounded-card bg-surface-raised p-3 shadow-box">
        {/* Shown above already, in the panel's "Send exactly". */}
        {origin && quote.amountIn && panelView?.kind !== 'waiting' ? (
          <Detail label="You send">
            <AssetAmount
              symbol={origin.symbol}
              amount={amount(quote.amountIn, origin.decimals)}
            />
            <span className="px-1 text-text-muted">on</span>
            <ChainName chain={origin.blockchain} />
          </Detail>
        ) : null}
        {quote.minAmountOut ? (
          <Detail label="You supply at least">
            <AssetAmount
              symbol={option.symbol}
              amount={amount(quote.minAmountOut, option.decimals)}
            />
          </Detail>
        ) : (
          <Detail label="Supplying">
            <AssetAmount symbol={option.symbol} />
          </Detail>
        )}
        {fee ? (
          <Detail label="Network fee">
            <AssetAmount
              symbol={option.symbol}
              amount={amount(fee, option.decimals)}
            />
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

      {exec.status === 'OPERATION_FAILED' ? (
        <WaitingNotice
          option={option}
          dappName={dappName}
          onSupply={onRecover}
        />
      ) : null}

      {!(panelView && origin) &&
      (flow.needsExternalDeposit || deposit?.kind === 'waiting') &&
      exec.depositAddress ? (
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
                flow.exec
                  .resume(waiting.id, resumeOptions(waiting.id))
                  .catch(() => undefined);
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
              flow.exec
                .resume(
                  described.stillLive!,
                  resumeOptions(described.stillLive),
                )
                .catch(() => undefined);
            }}>
            Keep following
          </Button>
        ) : null}
        {flow.state === 'IN_FLIGHT' && !waiting ? (
          <Button
            variant="primary"
            disabled={flow.isBusy}
            onClick={() => {
              void flow.resume(resumeOptions(flow.recoveryExecutionId));
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
        {!waiting &&
        ((flow.canCancel && !expired) || deposit?.kind === 'waiting') ? (
          <Button
            variant="secondary"
            className="h-12"
            disabled={exec.isCancelling}
            onClick={() => {
              if (flow.canCancel) {
                void flow.cancel();
              } else if (executionId) {
                // A transfer resumed in this session: the flow's own cancel
                // doesn't see it.
                exec.cancel(executionId).catch(() => undefined);
              }
            }}>
            {exec.isCancelling ? 'Sign to cancel…' : 'Cancel the supply'}
          </Button>
        ) : null}
        {deposit?.kind === 'waiting' ? (
          <p className="text-center text-text-muted">
            Cancel only if you haven&apos;t sent anything.
          </p>
        ) : null}
        {leave ? (
          <Button variant="primary" onClick={onDone}>
            {exec.phase === 'success' ? 'Done' : 'Back to the form'}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
