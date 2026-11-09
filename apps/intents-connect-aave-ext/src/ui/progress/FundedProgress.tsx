import type { ReactNode } from 'react';
import {
  type BalanceToken,
  isUserRejection,
} from '@aurora-is-near/intents-connect';
import type {
  FundedFlowStage,
  UseIntentsFundedFlowResult,
} from '@aurora-is-near/intents-connect/react';

import { formatAmount } from '../assets/amounts';
import { AssetAmount, ChainName } from '../assets/AssetAmount';
import { chainLabel } from '../assets/tokens';
import { type Politeness, Spoken } from '../a11y';
import type { DeliverableOption } from '../supply/options';
import { Button, CheckIcon, CopyButton, Notice, truncateMiddle } from '../ui';
import { describeFailure } from './describeFailure';
import { Detail, TxLink } from './ProgressScreen';
import { StepBar } from './StepBar';

const STEPS = ['Prepare', 'Move', 'Supply', 'Done'];

const STAGE_STEP: Record<FundedFlowStage, number> = {
  idle: 0,
  quoting: 0,
  'ready-to-transfer': 1,
  'awaiting-transfer-signature': 1,
  'submitting-transfer': 1,
  bridging: 1,
  'awaiting-arrival': 1,
  'ready-to-supply': 2,
  supplying: 2,
  success: 3,
  refunded: 1,
  failed: 1,
};

/** What the user is supplying from, and how it's paid. */
type FundedSupply = {
  source: 'intents' | 'confidential';
  option?: DeliverableOption;
  /** The token moved out of the intents account, when the list knows it. */
  origin?: BalanceToken;
};

const FROM_LABEL = {
  intents: 'Intents account',
  confidential: 'Private balance',
};

/**
 * A supply paid from intents (or confidential) balances: the move to the
 * wallet's Aurora account on the market's chain, then the supply there.
 * Each leg asks for one signature; between them it carries on closed.
 */
export const FundedProgress = ({
  funded,
  supply: { source, option, origin },
  unsigned = false,
  dappName,
  destinationTitle,
  onDone,
}: {
  funded: Omit<UseIntentsFundedFlowResult<unknown>, 'submit'>;
  supply: FundedSupply;
  /** Its supply step was created but never signed (found after a reload). */
  unsigned?: boolean;
  dappName: string;
  destinationTitle: string;
  /** Left, once forgotten: after a success (`true`), or to start over. */
  onDone: (succeeded: boolean) => void;
}) => {
  const { stage, record, error, exec } = funded;
  const symbol = option?.symbol ?? 'funds';
  const chain = option ? chainLabel(option.chain) : 'the market’s chain';
  const from =
    source === 'confidential' ? 'private balance' : 'intents account';

  const amountOf = (value: string | undefined) =>
    value && option ? formatAmount(value, option.decimals) : undefined;

  const signingSupply =
    (stage === 'supplying' || stage === 'ready-to-supply') &&
    exec.phase === 'awaiting-signature';

  // Declining the supply leaves the funds where they arrived: say that, not
  // the deposit's "nothing was sent".
  const declinedSupply =
    stage === 'ready-to-supply' &&
    !!error &&
    (isUserRejection(error) || isUserRejection(error.cause));

  const described = declinedSupply
    ? { title: 'You declined the supply in your wallet', detail: undefined }
    : error && describeFailure(error, symbol);

  const halted =
    !!described ||
    stage === 'refunded' ||
    stage === 'failed' ||
    (stage === 'idle' && !!error);

  let headline: ReactNode;
  let spoken: { text: string; politeness: Politeness } | undefined;
  let actions: ReactNode = null;

  const startOver = (
    <Button
      variant="secondary"
      className="h-12"
      disabled={funded.isBusy}
      onClick={() => {
        void funded.dismiss().then(() => onDone(false));
      }}>
      {stage === 'idle' ? 'Back to the form' : 'Start over'}
    </Button>
  );

  const supplyIt = (
    <Button
      variant="primary"
      disabled={funded.isBusy}
      onClick={() => {
        void funded.supply();
      }}>
      Supply it
    </Button>
  );

  if (stage === 'success') {
    // What landed, less the supply's fee: what the position grew by.
    const landed = record?.arrivedBalance ?? record?.amountOut;
    const supplied =
      landed && exec.networkFee && BigInt(landed) > BigInt(exec.networkFee)
        ? amountOf((BigInt(landed) - BigInt(exec.networkFee)).toString())
        : amountOf(landed ?? record?.quote.minAmountOut);

    spoken = { text: `Supplied to ${destinationTitle}`, politeness: 'polite' };
    headline = (
      <Notice tone="info">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cta text-cta-text">
            <CheckIcon size={20} />
          </span>
          <p className="font-medium">Supplied to {destinationTitle}</p>
          <p className="text-text-secondary">
            {supplied ? `About ${supplied} ${symbol}. ` : null}
            It shows up in Your supplies on {dappName} within a minute.
          </p>
        </div>
      </Notice>
    );
    actions = (
      <Button
        variant="primary"
        onClick={() => {
          void funded.dismiss().then(() => onDone(true));
        }}>
        Done
      </Button>
    );
  } else if (stage === 'refunded') {
    const refunded = record?.refundedAmount;

    spoken = { text: "The move didn't go through", politeness: 'assertive' };
    headline = (
      <Notice tone="warning">
        <p className="font-medium">The move didn&apos;t go through</p>
        <p className="mt-1 text-text-secondary">
          {refunded && origin
            ? `${formatAmount(refunded, origin.decimals)} ${origin.symbol} went back to your ${from}.`
            : `The funds went back to your ${from}.`}{' '}
          Nothing was supplied.
        </p>
      </Notice>
    );
    actions = startOver;
  } else if (stage === 'supplying' && unsigned && !funded.isBusy) {
    spoken = { text: 'Sign to finish your supply', politeness: 'polite' };
    headline = (
      <div>
        <p className="font-medium">Sign to finish your supply</p>
        <p className="mt-0.5 text-text-secondary">
          The funds arrived on {chain}, and the supply was prepared but not
          signed.
        </p>
      </div>
    );
    actions = supplyIt;
  } else if (signingSupply) {
    spoken = { text: 'Sign in your wallet', politeness: 'polite' };
    headline = (
      <div>
        <p className="font-medium">Sign in your wallet</p>
        <p className="mt-0.5 text-text-secondary">
          The second signature: it supplies what arrived. It moves nothing else.
        </p>
      </div>
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
        {stage === 'ready-to-supply' ? (
          <p className="mt-1 text-text-secondary">
            The funds wait with your Aurora account on {chain}: supply them now,
            or later from this wallet.
          </p>
        ) : null}
      </Notice>
    );

    if (stage === 'ready-to-supply') {
      actions = supplyIt;
    } else if (stage === 'ready-to-transfer') {
      actions = (
        <>
          <Button
            variant="primary"
            disabled={funded.isBusy}
            onClick={() => {
              void funded.retryTransfer();
            }}>
            Sign again
          </Button>
          {startOver}
        </>
      );
    } else if (!funded.isBusy) {
      actions = startOver;
    }
  } else {
    const copy: Partial<Record<FundedFlowStage, [string, string?]>> = {
      idle: ['Preparing…'],
      quoting: ['Preparing…', 'Getting the final quote for the move.'],
      'ready-to-transfer': [
        'Sign the move',
        `It moves the funds out of your ${from}. Nothing has moved yet.`,
      ],
      'awaiting-transfer-signature': [
        'Sign in your wallet',
        `The first signature: it moves ${origin?.symbol ?? 'the funds'} out of your ${from}. Nothing is sent from the wallet itself.`,
      ],
      'submitting-transfer': ['Submitting…'],
      bridging: [
        `Moving to ${chain}…`,
        'You can close this: it carries on, and your wallet asks for the second signature once the funds arrive.',
      ],
      'awaiting-arrival': [
        `Arriving on ${chain}…`,
        'You can close this: it carries on.',
      ],
      'ready-to-supply': [
        `Arrived on ${chain}`,
        'Supply it: one more signature.',
      ],
      supplying: ['Supplying…', 'You can close this: it carries on.'],
    };

    const [title, detail] = copy[stage] ?? ['Working…'];

    spoken = { text: title, politeness: 'polite' };
    headline = (
      <div>
        <p className="font-medium">{title}</p>
        {detail ? <p className="mt-0.5 text-text-secondary">{detail}</p> : null}
      </div>
    );

    if (stage === 'ready-to-supply') {
      actions = supplyIt;
    } else if (stage === 'ready-to-transfer') {
      actions = (
        <>
          <Button
            variant="primary"
            disabled={funded.isBusy}
            onClick={() => {
              void funded.retryTransfer();
            }}>
            Sign the move
          </Button>
          {startOver}
        </>
      );
    }
  }

  const supplyTx = exec.execution?.transaction?.evmTxHash;
  const executionId = record?.stepsExecutionId ?? exec.executionId;
  const arrives = amountOf(record?.amountOut ?? record?.quote.minAmountOut);

  return (
    <div className="flex flex-col gap-4">
      <Spoken text={spoken?.text} politeness={spoken?.politeness} />
      <StepBar
        steps={STEPS}
        current={STAGE_STEP[stage]}
        complete={stage === 'success'}
        halted={halted}
      />

      {headline}

      <dl className="flex flex-col gap-1.5 rounded-card bg-surface-raised p-3 shadow-box">
        <Detail label="From">
          {origin && record ? (
            <>
              <AssetAmount
                symbol={origin.symbol}
                amount={formatAmount(record.amountIn, origin.decimals)}
              />
              <span className="px-1 text-text-muted">·</span>
            </>
          ) : null}
          {FROM_LABEL[source]}
        </Detail>
        {option && stage !== 'refunded' ? (
          <Detail label={record?.amountOut ? 'Arrived' : 'Arrives at least'}>
            <AssetAmount symbol={option.symbol} amount={arrives} />
            <span className="px-1 text-text-muted">on</span>
            <ChainName chain={option.chain} />
          </Detail>
        ) : null}
        {exec.networkFee && option ? (
          <Detail label="Network fee">
            <AssetAmount
              symbol={option.symbol}
              amount={formatAmount(exec.networkFee, option.decimals)}
            />
          </Detail>
        ) : null}
        {supplyTx && option ? (
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
        {record && (halted || stage === 'success') ? (
          <Detail label="Move">
            <span title={record.correlationId}>
              {truncateMiddle(record.correlationId, 6, 4)}
            </span>
            <CopyButton value={record.correlationId} label="move id" />
          </Detail>
        ) : null}
      </dl>

      {actions ? <div className="flex flex-col gap-2">{actions}</div> : null}
    </div>
  );
};
