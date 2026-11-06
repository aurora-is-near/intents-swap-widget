import { type ReactNode, useEffect, useState } from 'react';
import type { StepsPlan, StepsPreview } from '@aurora-is-near/intents-connect';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { formatAmount } from '../assets/amounts';
import { AssetAmount } from '../assets/AssetAmount';
import { chainLabel } from '../assets/tokens';
import { describeFailure } from '../progress/describeFailure';
import type { WaitingInput } from '../supply/types';
import { Spoken } from '../a11y';
import { Button, CheckIcon, Notice, Skeleton } from '../ui';
import type { Waiting } from './WaitingFunds';

/** A steps preview is committable for 30 s: priced again before that. */
const PREVIEW_REFRESH_MS = 25_000;

/** A recovery, kept by the modal so it outlives a close. */
export type Recovery = {
  waiting: Waiting;
  state: 'idle' | 'running' | 'success' | 'failed';
  error?: Error;
  executionId?: string;
};

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="shrink-0 text-text-secondary">{label}</dt>
    <dd className="flex min-w-0 items-center justify-end font-medium">
      {children}
    </dd>
  </div>
);

/**
 * Supplies funds already waiting at the wallet's intermediary: a
 * steps-only run on the modal's runner, with no bridge and no deposit.
 * Previewed (and re-priced) first, so the user sees what lands and the fee.
 */
export const RecoverScreen = ({
  exec,
  recovery,
  buildStepsPlan,
  dappName,
  destinationTitle,
  onStart,
  onRetry,
  onDone,
}: {
  exec: UseExecutionResult;
  recovery: Recovery;
  buildStepsPlan: (input: WaitingInput) => StepsPlan;
  dappName: string;
  destinationTitle: string;
  /** Runs the previewed plan. */
  onStart: (plan: StepsPlan) => void;
  /** After a failure: back to a fresh preview. */
  onRetry: () => void;
  onDone: () => void;
}) => {
  const { option, amount } = recovery.waiting;
  const { previewSteps } = exec;
  const [round, setRound] = useState(0);
  const [preview, setPreview] = useState<StepsPreview>();
  const [previewError, setPreviewError] = useState<Error>();
  const idle = recovery.state === 'idle';

  useEffect(() => {
    if (!idle) {
      return undefined;
    }

    let live = true;

    previewSteps(
      buildStepsPlan({
        option,
        destinationAsset: option.destinationAsset,
        amount,
      }),
    ).then(
      (next) => {
        if (live) {
          setPreview(next);
          setPreviewError(undefined);
        }
      },
      (error: unknown) => {
        if (live) {
          setPreview(undefined);
          setPreviewError(toError(error));
        }
      },
    );

    const timer = setTimeout(
      () => setRound((value) => value + 1),
      PREVIEW_REFRESH_MS,
    );

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [idle, previewSteps, buildStepsPlan, option, amount, round]);

  const tokens = (value: string) =>
    `${formatAmount(value, option.decimals)} ${option.symbol}`;

  if (recovery.state === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <Spoken text={`Supplied to ${destinationTitle}`} />
        <Notice tone="info">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cta text-cta-text">
              <CheckIcon size={20} />
            </span>
            <p className="font-medium">Supplied to {destinationTitle}</p>
            <p className="text-text-secondary">
              It shows up in Your supplies on {dappName} within a minute.
            </p>
          </div>
        </Notice>
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  if (recovery.state === 'running') {
    const signing = exec.phase === 'awaiting-signature';

    return (
      <div className="flex flex-col gap-4">
        <Spoken text={signing ? 'Sign in your wallet' : 'Supplying…'} />
        <div>
          <p className="font-medium">
            {signing ? 'Sign in your wallet' : 'Supplying…'}
          </p>
          <p className="mt-0.5 text-text-secondary">
            {signing
              ? 'A message authorising the supply. It moves no funds.'
              : 'You can close this: it carries on.'}
          </p>
        </div>
        <Skeleton className="h-[60px]" />
      </div>
    );
  }

  const failure = recovery.state === 'failed' ? recovery.error : previewError;
  const described = failure
    ? describeFailure(failure, option.symbol)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Spoken text={described?.title} politeness="assertive" />
      <p className="text-text-secondary">
        {tokens(amount)} waits with this wallet&apos;s Aurora account on{' '}
        {chainLabel(option.chain)}, from a supply whose last step failed. Supply
        it now: no bridge this time, only the network fee.
      </p>

      {preview ? (
        <dl className="flex flex-col gap-1.5 rounded-card bg-surface-raised p-3 shadow-box">
          <Line label="You supply">
            <AssetAmount
              symbol={option.symbol}
              amount={formatAmount(preview.spendable, option.decimals)}
            />
          </Line>
          {preview.networkFee ? (
            <Line label="Network fee">
              <AssetAmount
                symbol={option.symbol}
                amount={formatAmount(preview.networkFee, option.decimals)}
              />
            </Line>
          ) : null}
        </dl>
      ) : null}
      {!preview && !described ? <Skeleton className="h-[60px]" /> : null}

      {described ? (
        <Notice tone="warning">
          <p className="font-medium">{described.title}</p>
          {described.detail ? (
            <p className="mt-1 break-words text-text-secondary">
              {described.detail}
            </p>
          ) : null}
        </Notice>
      ) : null}

      {recovery.state === 'failed' ? (
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      ) : (
        <Button
          variant="primary"
          disabled={!preview || exec.isBusy}
          onClick={() => {
            if (preview) {
              onStart(preview.plan);
            }
          }}>
          {preview ? `Supply ${tokens(preview.spendable)}` : 'Getting a quote…'}
        </Button>
      )}
    </div>
  );
};
