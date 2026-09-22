import { useEffect, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Input,
  TinyNumber,
} from '@aurora-is-near/intents-swap-widget';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { PHASE_COPIES, STATUS_COPIES } from '../../shared/copies';
import { SubmitButton } from '../../shared/components/SubmitButton';
import { SOLANA_USDC } from '../constants';
import type { SolanaToken } from '../constants';
import type { SolanaSpendQuote } from '../spend';
import { parseSolanaRecipient } from '../withdraw';

export type SpendKind = 'sell' | 'withdraw';

type Props = {
  token: SolanaToken & { amount: string };
  kind: SpendKind;
  /** Whether this row's panel is open. */
  isActive: boolean;
  /** Another row is open or busy, or the buy card is running. */
  isLocked: boolean;
  isBusy: boolean;
  exec: UseExecutionResult;
  quote?: SolanaSpendQuote;
  quoteMoved: boolean;
  isCommitted: boolean;
  /** The last preview / commit error for this row, if any. */
  error?: Error;
  recipient: string;
  onRecipientChange: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onExecute: () => void;
};

const LABELS: Record<SpendKind, { action: string; confirm: string }> = {
  sell: { action: 'Sell', confirm: 'Confirm sell' },
  withdraw: { action: 'Withdraw', confirm: 'Confirm withdraw' },
};

const recipientError = (value: string) => {
  if (!value.trim()) {
    return 'Enter the Solana wallet to receive the USDC';
  }

  try {
    parseSolanaRecipient(value);

    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

export const SpendRow = ({
  token,
  kind,
  isActive,
  isLocked,
  isBusy,
  exec,
  quote,
  quoteMoved,
  isCommitted,
  error,
  recipient,
  onRecipientChange,
  onOpen,
  onClose,
  onExecute,
}: Props) => {
  const labels = LABELS[kind];
  const [dismissedError, setDismissedError] = useState<Error>();

  useEffect(() => {
    if (isBusy) {
      setDismissedError(undefined);
    }
  }, [isBusy]);

  const addressError =
    kind === 'withdraw' ? recipientError(recipient) : undefined;

  const hasReview = !!quote && !isCommitted;
  const showError = error && error !== dismissedError && !isBusy;
  const isSettled =
    exec.phase === 'success' ||
    exec.phase === 'failed' ||
    exec.phase === 'cancelled';

  // A real create can fail its fee or acceptance check before any signature.
  // It already holds the per-wallet lock, so offer the cancel action here.
  // Keyed on the signature, not on a `CREATED` status: steps-only executions
  // report `OPERATION_PENDING` from creation.
  const canCancel =
    !isBusy &&
    ((exec.phase === 'failed' &&
      !!exec.executionId &&
      !exec.hasSubmittedSignature) ||
      exec.recovery?.kind === 'resume-or-cancel');

  const cancelExecutionId =
    exec.recovery?.kind === 'resume-or-cancel'
      ? exec.recovery.executionId
      : exec.executionId;

  const confirmLabel = (() => {
    if (isBusy) {
      // The runner is idle while the preview (Jupiter + dry create) runs.
      return exec.phase === 'idle' ? 'Preparing...' : PHASE_COPIES[exec.phase];
    }

    return hasReview ? labels.confirm : 'Get quote';
  })();

  const confirmState = (() => {
    if (isBusy) {
      return 'loading' as const;
    }

    if (addressError !== undefined || exec.isCancelling) {
      return 'disabled' as const;
    }

    return 'default' as const;
  })();

  return (
    <Card as="li" padding="none">
      <div className="flex items-center justify-between px-sw-lg py-sw-md gap-sw-lg">
        <div>
          <p className="text-sw-label-md text-sw-gray-100">{token.symbol}</p>
          <p>
            {token.mint === SOLANA_USDC.mint
              ? 'USDC in your Connect account'
              : token.name}
          </p>
        </div>
        <div className="flex items-center gap-sw-md">
          <span className="text-sw-label-md text-sw-gray-100">
            <TinyNumber value={token.amount} decimals={token.decimals} />
          </span>
          {!isActive && (
            <Button
              size="sm"
              variant="outlined"
              className="py-sw-sm"
              state={isLocked ? 'disabled' : 'default'}
              onClick={onOpen}>
              {labels.action}
            </Button>
          )}
        </div>
      </div>

      {isActive && (
        <div className="flex flex-col gap-sw-md px-sw-lg pb-sw-lg">
          {kind === 'withdraw' && (
            <div className="flex flex-col gap-sw-xs">
              <label
                htmlFor={`recipient-${token.mint}`}
                className="text-sw-label-md text-sw-gray-100">
                Send USDC to
              </label>
              <Input
                id={`recipient-${token.mint}`}
                placeholder="Solana wallet address"
                defaultValue={recipient}
                state={isBusy || isCommitted ? 'disabled' : 'default'}
                onChange={(event) => onRecipientChange(event.target.value)}
              />
              {!!recipient.trim() && !!addressError && (
                <p className="text-sw-body-sm text-sw-status-error">
                  {addressError}
                </p>
              )}
            </div>
          )}

          {quote && (
            <dl className="flex flex-col gap-sw-sm text-sw-body-sm text-sw-gray-300">
              <div className="flex justify-between gap-sw-md">
                <dt>{kind === 'sell' ? 'Estimated USDC' : 'You receive'}</dt>
                <dd>
                  <TinyNumber
                    value={quote.receive}
                    decimals={SOLANA_USDC.decimals}
                  />{' '}
                  USDC
                </dd>
              </div>
              {quote.minimumReceive !== quote.receive && (
                <div className="flex justify-between gap-sw-md">
                  <dt>Minimum USDC</dt>
                  <dd>
                    <TinyNumber
                      value={quote.minimumReceive}
                      decimals={SOLANA_USDC.decimals}
                    />{' '}
                    USDC
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-sw-md">
                <dt>Connect network fee</dt>
                <dd>
                  {quote.networkFee === undefined ? (
                    'Unavailable'
                  ) : (
                    <>
                      <TinyNumber
                        value={quote.networkFee}
                        decimals={SOLANA_USDC.decimals}
                      />{' '}
                      USDC
                    </>
                  )}
                </dd>
              </div>
              {!!quote.route && (
                <div className="flex justify-between gap-sw-md">
                  <dt>Jupiter route</dt>
                  <dd className="text-right">{quote.route}</dd>
                </div>
              )}
            </dl>
          )}

          {!!quote?.warning && !isCommitted && (
            <Banner hasBg multiline variant="warn" message={quote.warning} />
          )}

          {quoteMoved && (
            <Banner
              hasBg
              multiline
              variant="warn"
              message={`The guaranteed USDC decreased. Review the refreshed quote and press ${labels.confirm} to accept it.`}
            />
          )}

          {exec.phase !== 'idle' && !!exec.status && !isSettled && (
            <p className="text-sw-body-sm text-sw-gray-300">
              {STATUS_COPIES[exec.status]}
            </p>
          )}

          {showError && (
            <Banner
              hasBg
              multiline
              variant="error"
              message={`${error.message}${
                error.cause instanceof Error ? ` — ${error.cause.message}` : ''
              }`}
              onDismiss={() => setDismissedError(error)}
            />
          )}

          {exec.phase === 'success' && !isBusy && (
            <Banner
              hasBg
              multiline
              variant="success"
              message={
                kind === 'sell'
                  ? `Sold ${token.symbol} for USDC in your Connect account`
                  : 'USDC sent to the recipient wallet'
              }
            />
          )}

          {!!exec.execution?.transaction?.solanaTxHash && (
            <a
              className="text-sw-body-sm underline text-sw-gray-300"
              target="_blank"
              rel="noreferrer"
              href={`https://explorer.solana.com/tx/${exec.execution.transaction.solanaTxHash}`}>
              View Solana transaction
            </a>
          )}

          {exec.isCancelling ? (
            <SubmitButton.Cancel exec={exec} executionId={cancelExecutionId} />
          ) : (
            <div className="flex gap-sw-md">
              {!isSettled && (
                <Button
                  fluid
                  size="md"
                  variant="primary"
                  className="w-full"
                  state={confirmState}
                  onClick={onExecute}>
                  {confirmLabel}
                </Button>
              )}
              {canCancel && (
                <SubmitButton.Cancel
                  exec={exec}
                  executionId={cancelExecutionId}
                />
              )}
              {!isBusy && (
                <Button
                  size="md"
                  variant="outlined"
                  className="w-full"
                  onClick={onClose}>
                  {isSettled ? 'Done' : 'Back'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
