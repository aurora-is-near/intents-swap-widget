import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  Banner,
  CopyButton,
  TinyNumber,
  Toggle,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import { isNotEmptyAmount } from '@aurora-is-near/intents-swap-widget/utils';
import type { UseExecutionResult } from '@aurora-is-near/intents-connect/react';

import { SubmitButton } from './SubmitButton';
import { DepositQrCode } from './DepositQrCode';
import { WidgetIntentsConnect } from './Widget';
import { STATUS_COPIES } from '../copies';
import type { DestinationToken } from '../config';
import { useIntentsConnectDeposit } from '../hooks/useIntentsConnectDeposit';
import type { BuildPlanFn } from '../hooks/useIntentsConnectDeposit';

type WidgetProps = React.ComponentProps<typeof WidgetIntentsConnect>;

/** Everything an integration has to say about itself. */
export type IntegrationProps = {
  /** Owned by the tab, so its panel reads the same runner the card drives. */
  exec: UseExecutionResult;
  /** The asset the network fee is charged in — NOT the origin token. */
  destinationToken: DestinationToken;
  successMessage: string;
  submitLabel: string;
  /** Extra inputs, rendered above the deposit-mode toggle. */
  FieldsComponent?: ReactNode;
  /** Gates the deposit button on top of token/amount/wallet. */
  isReady?: boolean;
};

type Props<TParams = unknown> = IntegrationProps & {
  buildPlan: BuildPlanFn<TParams>;
  onBusyChange: (isBusy: boolean) => void;
};

const ExecutionPhaseMessage = ({
  exec,
  destinationToken,
}: {
  exec: Exclude<UseExecutionResult, { phase: 'idle' }>;
  destinationToken: DestinationToken;
}) => {
  return (
    <div className="flex items-center justify-between text-sm text-sw-body-sm text-sw-gray-300 px-sw-md">
      <p>{exec.status ? STATUS_COPIES[exec.status] : ''}</p>
      {!!exec.networkFee && (
        <p>
          Fees:{' '}
          <TinyNumber
            value={exec.networkFee}
            decimals={destinationToken.decimals}
          />{' '}
          {destinationToken.symbol}
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

const Content = <TParams,>({
  exec,
  buildPlan,
  onBusyChange,
  destinationToken,
  successMessage,
  submitLabel,
  FieldsComponent,
  isReady = true,
}: Props<TParams>) => {
  const { ctx } = useUnsafeSnapshot();

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
    isReady &&
    !!ctx.sourceToken &&
    !!ctx.walletAddress &&
    !depositState.isBusy &&
    isNotEmptyAmount(ctx.sourceTokenAmount);

  // The engine holds the phase at 'awaiting-deposit' the entire time the
  // user's funds are still expected ('expired' is its revivable-by-a-late-
  // deposit variant) — the address panel keys off that hold. Two exclusions:
  // a FAILED deposit state is the retry-transfer path (the Retry button, not
  // the QR code, is the call to action), and a busy fresh run in wallet mode
  // is the engine driving the connected wallet's own transfer, where the
  // open wallet prompt is.
  const needsExternalDeposit =
    !!exec.depositAddress &&
    !exec.depositTxHash &&
    (exec.phase === 'awaiting-deposit' || exec.phase === 'expired') &&
    depositState.state !== 'FAILED' &&
    !(depositViaWallet && depositState.state === 'IDLE' && depositState.isBusy);

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
        <ExecutionPhaseMessage
          exec={exec}
          destinationToken={destinationToken}
        />
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
        <Banner hasBg multiline variant="success" message={successMessage} />
      )}
    </>
  );

  const externalDeposit = needsExternalDeposit && !!exec.depositAddress && (
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
  const canCancel = depositState.state === 'FAILED' || needsExternalDeposit;

  return (
    <>
      {externalDeposit}

      {/* Hidden once the address is up for the same reason as the toggle: the
          plan is already committed, so an editable field would misdescribe the
          live execution. */}
      {!needsExternalDeposit && FieldsComponent}

      {/* Hidden once the address is up: the choice has been made and acted
          on, the block above already says what to do, and the mode cannot
          change for a live execution anyway. */}
      {!needsExternalDeposit && (
        <div className="flex items-center justify-between gap-sw-lg">
          <div className="flex flex-col gap-sw-xxs">
            <span className="text-sw-label-md text-sw-gray-100">
              Send from connected wallet
            </span>
            <span className="text-sw-body-sm text-sw-gray-400">
              {depositViaWallet
                ? 'The wallet is prompted to transfer the funds'
                : 'You send the funds yourself — a deposit address is shown after signing'}
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
            label={submitLabel}
            canDeposit={canDeposit}
            depositState={depositState}
          />
          <SubmitButton.Cancel exec={exec} executionId={cancelExecutionId} />
        </div>
      ) : (
        <SubmitButton.Deposit
          exec={exec}
          label={submitLabel}
          canDeposit={canDeposit}
          depositState={depositState}
        />
      )}
      {messages}
    </>
  );
};

export const Layout = <TParams,>({
  exec,
  buildPlan,
  destinationToken,
  successMessage,
  submitLabel,
  FieldsComponent,
  isReady,
  onBusyChange,
  ...widgetProps
}: Pick<Props<TParams>, 'buildPlan'> &
  IntegrationProps & {
    /** Lifted so the tab bar can refuse to switch away mid-execution. */
    onBusyChange?: (isBusy: boolean) => void;
  } & Omit<WidgetProps, 'isBusy' | 'children' | 'onBusyChange'>) => {
  const [isBusy, setIsBusy] = useState(false);

  return (
    <WidgetIntentsConnect {...widgetProps} isBusy={isBusy}>
      <Content
        exec={exec}
        buildPlan={buildPlan}
        destinationToken={destinationToken}
        successMessage={successMessage}
        submitLabel={submitLabel}
        FieldsComponent={FieldsComponent}
        isReady={isReady}
        onBusyChange={(busy) => {
          setIsBusy(busy);
          onBusyChange?.(busy);
        }}
      />
    </WidgetIntentsConnect>
  );
};
