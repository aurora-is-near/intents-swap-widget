import { useEffect, useState } from 'react';

import {
  Banner,
  CopyButton,
  TinyNumber,
  Toggle,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import { useExecution } from '@aurora-is-near/intents-connect/react';
import { isNotEmptyAmount } from '@aurora-is-near/intents-swap-widget/utils';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { SubmitButton } from './SubmitButton';
import { DepositQrCode } from './DepositQrCode';
import { WidgetIntentsConnect } from './Widget';
import {
  DEPOSIT_EXTERNAL_HINT,
  DEPOSIT_VIA_WALLET_COPY,
  DEPOSIT_VIA_WALLET_HINT,
  STATUS_COPIES,
} from '../constants/copies';
import * as constants from '../constants';
import { useIntentsConnectDeposit } from '../hooks/useIntentsConnectDeposit';
import type { BuildPlanFn } from '../hooks/useIntentsConnectDeposit';

type WidgetProps = React.ComponentProps<typeof WidgetIntentsConnect>;
type Props<TParams = unknown> = {
  buildPlan: BuildPlanFn<TParams>;
  onBusyChange: (isBusy: boolean) => void;
};

const ExecutionPhaseMessage = ({
  exec,
}: {
  exec: Exclude<UseExecutionResult, { phase: 'idle' }>;
}) => {
  return (
    <div className="flex items-center justify-between text-sm text-sw-body-sm text-sw-gray-300 px-sw-md">
      <p>{exec.status ? STATUS_COPIES[exec.status] : ''}</p>
      {!!exec.networkFee && (
        <p>
          Fees:{' '}
          <TinyNumber
            value={exec.networkFee}
            decimals={constants.DEST_TOKEN.decimals}
          />{' '}
          {constants.DEST_TOKEN.symbol}
        </p>
      )}
    </div>
  );
};

const ExecutionErrorMessage = ({
  exec,
  onDismiss,
}: {
  exec: UseExecutionResult;
  onDismiss: () => void;
}) => {
  if (!exec.error) {
    return null;
  }

  const cause =
    exec.error.cause instanceof Error ? exec.error.cause.message : undefined;

  const message = `${exec.error.message}${cause ? ` — ${cause}` : ''}`;

  return (
    <Banner
      hasBg
      multiline
      variant="error"
      message={message}
      onDismiss={onDismiss}
    />
  );
};

const Content = <TParams,>({ buildPlan, onBusyChange }: Props<TParams>) => {
  const { ctx } = useUnsafeSnapshot();

  const exec = useExecution();

  // Which side moves the funds. `true` prompts the connected wallet; `false`
  // is the exchange / QR path, where the deposit address is surfaced and the
  // user sends from wherever they like.
  const [depositViaWallet, setDepositViaWallet] = useState(true);

  const depositState = useIntentsConnectDeposit({
    exec,
    token: ctx.sourceToken,
    amount: ctx.sourceTokenAmount,
    depositViaWallet,
    buildPlan,
  });

  const canDeposit =
    !!ctx.sourceToken &&
    !!ctx.walletAddress &&
    !depositState.isBusy &&
    isNotEmptyAmount(ctx.sourceTokenAmount);

  const isUnrecoverableMissedDeposit =
    !!exec.depositAddress && !exec.depositTxHash && exec.phase === 'settling';

  // Recovery states name the execution they are recovering; waiting for a
  // deposit is not one, so it falls back to the execution being driven.
  const cancelExecutionId =
    depositState.state === 'IDLE' ? exec.executionId : depositState.id;

  // Dismissal is per FAILURE, not permanent: the banner is hidden only for
  // the exact error object the user dismissed, so the next failure shows up
  // again. Kept out of the engine on purpose — hiding the message must not
  // clear `exec.error`, which is what the Retry / Cancel controls derive from.
  const [dismissedError, setDismissedError] = useState<Error>();

  useEffect(() => {
    onBusyChange(depositState.isBusy);

    // A new attempt supersedes the dismissal. The next failure is normally a
    // different object anyway; this also covers a wallet that rethrows the
    // very same Error instance.
    if (depositState.isBusy) {
      setDismissedError(undefined);
    }
  }, [depositState.isBusy]);

  const messages = (
    <>
      {exec.phase !== 'idle' && exec.phase !== 'success' && !!exec.status && (
        <ExecutionPhaseMessage exec={exec} />
      )}

      {/* A failure is superseded the moment a new attempt runs — showing it
          while the wallet prompt is open reads as "still failed". */}
      {!depositState.isBusy && exec.error !== dismissedError && (
        <ExecutionErrorMessage
          exec={exec}
          onDismiss={() => setDismissedError(exec.error)}
        />
      )}

      {exec.phase === 'success' && (
        <Banner
          hasBg
          multiline
          variant="success"
          message="Position minted to your wallet"
        />
      )}
    </>
  );

  const externalDeposit = isUnrecoverableMissedDeposit &&
    !!exec.depositAddress && (
      <div className="flex flex-col gap-sw-md">
        <Banner
          hasBg
          multiline
          variant="warn"
          message={`Waiting for deposit — send funds to the address ${exec.deadline ? `before ${new Date(exec.deadline).toLocaleTimeString()}` : ''}`}
        />
        <div className="pt-sw-lg">
          <DepositQrCode address={exec.depositAddress} />
        </div>
        <div className="py-sw-lg px-sw-lg w-full flex items-center justify-between rounded-sw-md bg-sw-gray-800">
          <span className="text-sw-label-md text-sw-gray-100 w-full text-center">
            {exec.depositAddress}
          </span>
          <CopyButton value={exec.depositAddress} />
        </div>
      </div>
    );

  // While a delete signature is pending there is exactly one thing the user
  // can do — sign it — so every other action collapses into that single
  // button. Without this, the Deposit button (busy, and relabelled for the
  // same prompt) renders beside the Cancel button as a confusing duplicate.
  if (exec.isCancelling) {
    return (
      <>
        {externalDeposit}
        <SubmitButton.Cancel exec={exec} executionId={cancelExecutionId} />
        {messages}
      </>
    );
  }

  if (depositState.state === 'IN_FLIGHT') {
    return (
      <>
        {externalDeposit}
        <div className="flex gap-sw-xl">
          <SubmitButton.Resume exec={exec} depositState={depositState} />
          <SubmitButton.Cancel exec={exec} executionId={cancelExecutionId} />
        </div>
        {messages}
      </>
    );
  }

  // Both dead-ends the user can act on: a failed transfer (retry or give up)
  // and a deposit the engine cannot send for them (pay it or give up) — the
  // latter would otherwise poll for ~12 minutes with no way out.
  const canCancel =
    depositState.state === 'FAILED' || isUnrecoverableMissedDeposit;

  return (
    <>
      {externalDeposit}

      {/* Hidden once the address is up: the choice has been made and acted
          on, the block above already says what to do, and the mode cannot
          change for a live execution anyway. */}
      {!isUnrecoverableMissedDeposit && (
        <div className="flex items-center justify-between gap-sw-lg">
          <div className="flex flex-col gap-sw-xxs">
            <span className="text-sw-label-md text-sw-gray-100">
              {DEPOSIT_VIA_WALLET_COPY}
            </span>
            <span className="text-sw-body-sm text-sw-gray-400">
              {depositViaWallet
                ? DEPOSIT_VIA_WALLET_HINT
                : DEPOSIT_EXTERNAL_HINT}
            </span>
          </div>
          {/* Locked while an execution is running: the mode is baked into the
              plan at submit time, so flipping it mid-flight would describe the
              live execution wrongly. */}
          <Toggle
            isOn={depositViaWallet}
            isDisabled={depositState.isBusy}
            onToggle={setDepositViaWallet}
          />
        </div>
      )}

      {canCancel ? (
        <div className="flex gap-sw-xl">
          <SubmitButton.Deposit
            exec={exec}
            canDeposit={canDeposit}
            depositState={depositState}
          />
          <SubmitButton.Cancel exec={exec} executionId={cancelExecutionId} />
        </div>
      ) : (
        <SubmitButton.Deposit
          exec={exec}
          canDeposit={canDeposit}
          depositState={depositState}
        />
      )}
      {messages}
    </>
  );
};

export const Layout = <TParams,>({
  buildPlan,
  ...widgetProps
}: Pick<Props<TParams>, 'buildPlan'> &
  Omit<WidgetProps, 'isBusy' | 'children' | 'onBusyChange'>) => {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <WidgetIntentsConnect {...widgetProps} isBusy={isBusy}>
      <Content buildPlan={buildPlan} onBusyChange={setIsBusy} />
    </WidgetIntentsConnect>
  );
};
