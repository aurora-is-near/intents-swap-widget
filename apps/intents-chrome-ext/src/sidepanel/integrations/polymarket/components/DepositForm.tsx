import { useEffect, useRef, useState } from 'react';

import {
  Banner,
  Button,
  CopyButton,
  TinyNumber,
  Toggle,
  TokenInput,
  useTokenInputPair,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import { isNotEmptyAmount } from '@aurora-is-near/intents-swap-widget/utils';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { DepositQrCode } from '../../../components/DepositQrCode';
import { PHASE_COPIES, STATUS_COPIES } from '../copies';
import { DEST_TOKEN } from '../constants';
import { useDeposit } from '../hooks/useDeposit';

type Props = {
  exec: UseExecutionResult;
  account: string;
  isAccountValid: boolean;
  onOpenTokens: () => void;
  onBusyChange: (isBusy: boolean) => void;
};

const errorMessage = (error: Error) => {
  const cause = error.cause instanceof Error ? error.cause.message : undefined;

  return `${error.message}${cause ? ` — ${cause}` : ''}`;
};

export const DepositForm = ({
  exec,
  account,
  isAccountValid,
  onOpenTokens,
  onBusyChange,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { onChangeAmount, onChangeToken } = useTokenInputPair();

  // `true` prompts the page wallet for the transfer; `false` shows a deposit
  // address to pay from anywhere (another wallet, an exchange).
  const [depositViaWallet, setDepositViaWallet] = useState(true);

  const deposit = useDeposit({
    exec,
    token: ctx.sourceToken,
    amount: ctx.sourceTokenAmount,
    account,
    depositViaWallet,
  });

  useEffect(() => onBusyChange(deposit.isBusy), [deposit.isBusy]);

  // Errors and the success banner belong to one attempt: any edit or a new
  // attempt retires them.
  const [dismissed, setDismissed] = useState<Error>();
  const [showSuccess, setShowSuccess] = useState(false);
  const previousPhase = useRef(exec.phase);

  useEffect(() => {
    if (exec.phase === 'success' && previousPhase.current !== 'success') {
      onChangeAmount('source', '');
      setShowSuccess(true);
    }

    previousPhase.current = exec.phase;
  }, [exec.phase]);

  useEffect(() => {
    if (deposit.isBusy) {
      setShowSuccess(false);
      setDismissed(undefined);
    }
  }, [deposit.isBusy]);

  const onUserInput = () => setShowSuccess(false);

  const canDeposit =
    isAccountValid &&
    !!ctx.sourceToken &&
    !deposit.isBusy &&
    isNotEmptyAmount(ctx.sourceTokenAmount);

  // The runner holds 'awaiting-deposit' (or its revivable 'expired') for as
  // long as funds are expected. Excluded: the retry-transfer path, and the
  // wallet's own transfer prompt during a fresh wallet-mode run.
  const needsExternalDeposit =
    !!exec.depositAddress &&
    !exec.depositTxHash &&
    (exec.phase === 'awaiting-deposit' || exec.phase === 'expired') &&
    deposit.state !== 'FAILED' &&
    !(depositViaWallet && deposit.state === 'IDLE' && deposit.isBusy);

  const cancelExecutionId =
    deposit.state === 'IDLE' ? exec.executionId : deposit.id;

  const cancelButton = (
    <Button
      size="lg"
      variant="outlined"
      className="w-full"
      state={exec.isCancelling ? 'loading' : 'default'}
      onClick={() => {
        exec.cancel(cancelExecutionId).catch(() => undefined);
      }}>
      {exec.isCancelling ? 'Sign to cancel' : 'Cancel'}
    </Button>
  );

  const renderPrimaryButton = () => {
    if (deposit.state === 'IN_FLIGHT') {
      return (
        <Button
          fluid
          size="lg"
          variant="primary"
          className="w-full"
          onClick={() => {
            exec
              .resume(deposit.id, { depositViaWallet })
              .catch(() => undefined);
          }}>
          Resume deposit
        </Button>
      );
    }

    if (deposit.state === 'FAILED') {
      return (
        <Button
          fluid
          size="lg"
          variant="primary"
          className="w-full"
          onClick={() => {
            exec.retryDeposit().catch(() => undefined);
          }}>
          Retry deposit
        </Button>
      );
    }

    let state: 'loading' | 'default' | 'disabled' = 'disabled';

    if (deposit.isBusy) {
      state = 'loading';
    } else if (canDeposit) {
      state = 'default';
    }

    return (
      <Button
        fluid
        size="lg"
        variant="primary"
        className="w-full"
        state={state}
        onClick={() => {
          void deposit.deposit();
        }}>
        {deposit.isBusy ? PHASE_COPIES[exec.phase] : 'Deposit to Polymarket'}
      </Button>
    );
  };

  const canCancel =
    deposit.state !== 'IDLE' || needsExternalDeposit || exec.isCancelling;

  const visibleError =
    !deposit.isBusy && (deposit.preparationError ?? exec.error);

  return (
    <div className="flex flex-col gap-sw-xl">
      <TokenInput.Source
        heading="You send"
        state={deposit.isBusy || needsExternalDeposit ? 'disabled' : 'default'}
        onMsg={(msg) => {
          if (msg.type === 'on_click_select_token') {
            onOpenTokens();
          }

          if (msg.type === 'on_change_amount') {
            onChangeAmount('source', msg.amount);
            onUserInput();
          }

          if (msg.type === 'on_select_token') {
            onChangeToken('source', msg.token);
            onUserInput();
          }
        }}
      />

      {needsExternalDeposit && !!exec.depositAddress && (
        <div className="flex flex-col gap-sw-lg">
          <Banner
            hasBg
            multiline
            variant="warn"
            message={`Send the funds to this address${
              exec.deadline
                ? ` before ${new Date(exec.deadline).toLocaleTimeString()}`
                : ''
            }. Only send ${ctx.sourceToken?.symbol ?? 'the selected token'} on ${
              ctx.sourceToken?.chainName ?? 'the selected network'
            }.`}
          />
          <DepositQrCode address={exec.depositAddress} />
          <div className="flex items-center gap-sw-md p-sw-lg rounded-sw-md bg-sw-gray-800">
            <span className="grow break-all text-center text-sw-label-sm text-sw-gray-100">
              {exec.depositAddress}
            </span>
            <CopyButton value={exec.depositAddress} />
          </div>
        </div>
      )}

      {!needsExternalDeposit && deposit.state === 'IDLE' && (
        <div className="flex items-center justify-between gap-sw-lg">
          <div className="flex flex-col gap-sw-xxs">
            <span className="text-sw-label-md text-sw-gray-100">
              Send from connected wallet
            </span>
            <span className="text-sw-body-sm text-sw-gray-400">
              {depositViaWallet
                ? 'Your wallet is asked to send the funds'
                : 'Sign once, then send from any wallet or exchange'}
            </span>
          </div>
          <Toggle
            isOn={depositViaWallet}
            isDisabled={deposit.isBusy}
            onToggle={setDepositViaWallet}
          />
        </div>
      )}

      {exec.isCancelling ? (
        cancelButton
      ) : (
        <div className="flex gap-sw-md">
          {renderPrimaryButton()}
          {canCancel && cancelButton}
        </div>
      )}

      {exec.phase !== 'idle' && exec.phase !== 'success' && !!exec.status && (
        <div className="flex items-center justify-between px-sw-md text-sw-body-sm text-sw-gray-300">
          <span>{STATUS_COPIES[exec.status]}</span>
          {!!exec.networkFee && (
            <span>
              Fee:{' '}
              <TinyNumber
                value={exec.networkFee}
                decimals={DEST_TOKEN.decimals}
              />{' '}
              {DEST_TOKEN.symbol}
            </span>
          )}
        </div>
      )}

      {!deposit.isBusy && deposit.state === 'IDLE' && (
        <p className="px-sw-md text-sw-body-sm text-sw-gray-400">
          Wallet prompts will show polymarket.com as the requester — the
          extension uses the wallet you connected there.
        </p>
      )}

      {visibleError && visibleError !== dismissed && (
        <Banner
          hasBg
          multiline
          variant="error"
          message={errorMessage(visibleError)}
          onDismiss={() => setDismissed(visibleError)}
        />
      )}

      {showSuccess && exec.phase === 'success' && (
        <Banner
          hasBg
          multiline
          variant="success"
          message="Deposited to your Polymarket account"
        />
      )}
    </div>
  );
};
