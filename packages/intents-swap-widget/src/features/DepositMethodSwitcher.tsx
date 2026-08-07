import { useEffect, useState } from 'react';
import { QrCodeW700 as QrCodeIcon } from '@material-symbols-svg/react-rounded/icons/qr-code';
import { ProgressActivityW700 as ProgressActivity } from '@material-symbols-svg/react-rounded/icons/progress-activity';
import { RefreshW700 as RefreshIcon } from '@material-symbols-svg/react-rounded/icons/refresh';

import { cn } from '@/utils/cn';
import { Card } from '@/components/Card';
import { Steps } from '@/components/Steps';
import { Toggle } from '@/components/Toggle';
import { Button } from '@/components/Button';
import { Tooltip } from '@/components/Tooltip';
import { ExternalDeposit, QRCodeSkeleton } from '@/features/ExternalDeposit';
import { RefundAddressStep } from '@/features/RefundAddressStep';
import { TokenSelectButton } from '@/components/TokenSelectButton';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useWalletAddressForToken } from '@/hooks/useWalletAddressForToken';
import { useConfig } from '@/config';

import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import { useTypedTranslation } from '@/localisation';
import { guardStates } from '@/machine/guards';
import { fireEvent } from '@/machine';

import type { TransferResult } from '@/types/transfer';
import { notReachable } from '../utils';

type Msg =
  | { type: 'on_transaction_received' }
  | { type: 'on_successful_transfer'; transferResult: TransferResult }
  | {
      type: 'on_toggle_tokens_modal';
      token: 'source' | 'target';
      isOpen: boolean;
    };

type Props = {
  mode: 'deposit' | 'swap';
  isExternalTxReceived?: boolean;
  className?: string;
  onMsg: (msg: Msg) => void;
};

const RetryButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTypedTranslation();

  return (
    <Button
      size="md"
      variant="primary"
      className="w-fit py-sw-sm px-sw-lg"
      onClick={onClick}>
      <RefreshIcon size={16} />
      {t('deposit.external.stepSelectToken.retry', 'Try again')}
    </Button>
  );
};

const ExtendedContent = ({ mode, onMsg }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { minDepositTokenAmount } = useComputedSnapshot();

  const isValidState = guardStates(ctx, [
    'initial_dry',
    'initial_wallet',
    'input_valid_internal',
    'input_valid_external',
    'quote_success_internal',
    'quote_success_external',
  ]);

  if (!isValidState) {
    return null;
  }

  // limit minimum deposit amount to 1 USD to avoid FLEX_INPUT quote failure
  const minDepositAmount = ctx.sourceToken
    ? formatBigToHuman(minDepositTokenAmount, ctx.sourceToken.decimals)
    : 0;

  if (
    ctx.walletAddress &&
    ctx.isDepositFromExternalWallet &&
    ctx.sourceToken &&
    mode === 'deposit'
  ) {
    if (ctx.quoteStatus === 'success') {
      return (
        <>
          <div className="w-full h-sw-2xl" />
          <ExternalDeposit
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_successful_transfer':
                  // can be null for confidential swap
                  if (msg.transferResult !== null) {
                    onMsg({
                      type: 'on_successful_transfer',
                      transferResult: msg.transferResult,
                    });
                  }

                  break;
                case 'on_transaction_received':
                  onMsg(msg);
                  break;
                default:
                  notReachable(msg, { throwError: false });
              }
            }}
          />
        </>
      );
    }

    return (
      <>
        <div className="w-full h-sw-2xl" />
        <QRCodeSkeleton />
      </>
    );
  }

  if (
    ctx.isDepositFromExternalWallet &&
    ctx.sourceToken &&
    ctx.targetToken &&
    mode === 'swap'
  ) {
    if (ctx.quoteStatus === 'success') {
      return (
        <>
          <div className="w-full h-sw-2xl" />
          <ExternalDeposit
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_successful_transfer':
                  // can be null for confidential swap
                  if (msg.transferResult !== null) {
                    onMsg({
                      type: 'on_successful_transfer',
                      transferResult: msg.transferResult,
                    });
                  }

                  break;
                case 'on_transaction_received':
                  onMsg(msg);
                  break;
                default:
                  notReachable(msg, { throwError: false });
              }
            }}
          />
        </>
      );
    }

    if (!ctx.walletAddress && (!ctx.sendAddress || !ctx.refundToAddress)) {
      return (
        <>
          <div className="w-full h-sw-2xl" />
          <div className="bg-sw-gray-800 h-[44px] w-full animate-pulse rounded-sw-md flex items-center justify-center gap-sw-sm">
            <ProgressActivity className="animate-spin text-sw-gray-100 h-sw-lg w-sw-lg" />
            <span className="text-sw-gray-100 text-sw-label-sm">
              {t(
                'deposit.external.loading.addresses',
                'Waiting for refund and recipient addresses',
              )}
            </span>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="w-full h-sw-2xl" />
        <QRCodeSkeleton />
      </>
    );
  }

  return (
    <Steps className="pt-sw-2xl">
      <Steps.Step
        title={t(
          'deposit.external.stepSelectToken.title',
          'Select token to deposit',
        )}
        description={
          ctx.sourceToken
            ? `Minimum deposit ${minDepositAmount} ${ctx.sourceToken.symbol}`
            : 'You can send any amount of this token'
        }
        asideElement={
          <TokenSelectButton
            token={ctx.sourceToken}
            state={ctx.externalDepositTxReceived ? 'disabled' : 'default'}
            onClick={() =>
              onMsg({
                type: 'on_toggle_tokens_modal',
                isOpen: true,
                token: 'source',
              })
            }
          />
        }
      />

      {ctx.isDepositFromExternalWallet && !ctx.walletAddress ? (
        <RefundAddressStep stepNumber={2} />
      ) : null}

      <Steps.Step
        title={`Send ${ctx.sourceToken ? `${ctx.sourceToken?.symbol} ` : ''}to address`}
        description={
          ctx.sourceToken
            ? `Use ${ctx.sourceToken.chainName} network`
            : "Use selected token's network"
        }
        asideElement={(() => {
          if (ctx.transferStatus.status === 'error') {
            return (
              <RetryButton
                onClick={() => fireEvent('retryExternalDeposit', null)}
              />
            );
          }

          switch (ctx.quoteStatus) {
            case 'idle':
            case 'success':
              // to avoid step container height jump on switching between error and loading state
              return <span className="h-[36px]" />;
            case 'error':
              return (
                <RetryButton onClick={() => fireEvent('quoteReset', null)} />
              );
            case 'pending':
            default:
              return (
                <div className="flex items-center justify-center h-[36px]">
                  <span className="animate-spin">
                    <ProgressActivity size={24} className="text-sw-gray-200" />
                  </span>
                </div>
              );
          }
        })()}>
        {ctx.quoteStatus === 'success' && (
          <ExternalDeposit
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_successful_transfer':
                  // can be null for confidential swap
                  if (msg.transferResult !== null) {
                    onMsg({
                      type: 'on_successful_transfer',
                      transferResult: msg.transferResult,
                    });
                  }

                  break;
                case 'on_transaction_received':
                  onMsg(msg);
                  break;
                default:
                  notReachable(msg, { throwError: false });
              }
            }}
          />
        )}
      </Steps.Step>
    </Steps>
  );
};

export const DepositMethodSwitcher = ({
  mode,
  isExternalTxReceived,
  className,
  onMsg,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  const { walletSignIn } = useWalletConnection();
  const { connectedWallets } = useConfig();

  const [pendingIsExternal, setPendingIsExternal] = useState<boolean | null>(
    null,
  );

  // Taken from the config rather than from ctx.walletAddress, which the widget
  // clears on mount and restores a render later - that gap reads exactly like a
  // disconnect and would toggle a connected user into the QR flow on open.
  const { walletAddress } = useWalletAddressForToken(
    connectedWallets,
    ctx.sourceToken,
  );

  // Aurora is a NEAR virtual chain and as such 1Click will return a Near
  // deposit address, which will not work if we attempt to deposit from an
  // external wallet.
  const isVirtualChainSource =
    !!ctx.sourceToken && isAuroraToken(ctx.sourceToken);

  const isIntentSelectionUnsupported =
    !!ctx.sourceToken?.isIntent ||
    (mode === 'swap' && !!ctx.targetToken?.isIntent);

  // These restrictions come from the source token, not from the wallet: an
  // Intents token has no external deposit address, and a virtual chain resolves
  // to a Near one that would not work. Waiving them while walletless let the QR
  // flow toggle into a state the effect below immediately undoes.
  const canBeToggled =
    !isExternalTxReceived &&
    !!ctx.sourceToken &&
    ((!!ctx.targetToken && mode === 'swap') || mode === 'deposit') &&
    !isIntentSelectionUnsupported &&
    !isVirtualChainSource;

  const canConnectWallet =
    !ctx.walletAddress && ctx.isDepositFromExternalWallet && !!walletSignIn;

  const applyDepositType = (isExternal: boolean) => {
    fireEvent('externalDepositTxSet', undefined);
    fireEvent('depositTypeSet', { isExternal });
  };

  // A token can also enter through a stale/default selection after the external
  // flow is active. Collapse back to the connected-wallet flow rather than let
  // an unsupported QR quote proceed. Intent targets remain valid for deposits,
  // but not for QR swaps.
  useEffect(() => {
    if (
      (isVirtualChainSource || isIntentSelectionUnsupported) &&
      ctx.isDepositFromExternalWallet
    ) {
      applyDepositType(false);
    }
  }, [
    isVirtualChainSource,
    isIntentSelectionUnsupported,
    ctx.isDepositFromExternalWallet,
  ]);

  useEffect(() => {
    if (pendingIsExternal === null) {
      return;
    }

    // the mode was already switched another way (i.e. by the effect above), so
    // there is nothing left to apply
    if (ctx.isDepositFromExternalWallet === pendingIsExternal) {
      setPendingIsExternal(null);

      return;
    }

    if (!ctx.walletAddress) {
      // drop the intent if no wallet shows up, otherwise a much later connect
      // from another part of the widget would silently flip the toggle
      const timeout = setTimeout(() => setPendingIsExternal(null), 60_000);

      return () => clearTimeout(timeout);
    }

    setPendingIsExternal(null);
    applyDepositType(pendingIsExternal);
  }, [pendingIsExternal, ctx.walletAddress, ctx.isDepositFromExternalWallet]);

  // Without a wallet there is nothing to deposit from, so the QR flow is the
  // only usable one. Kept as an invariant rather than as a reaction to the
  // disconnect: disconnecting resets the deposit type (see the
  // `isWalletDisconnected` subscription) and can remount this component, both of
  // which undo or miss a one-off switch.
  useEffect(() => {
    // An Intents target routes validation through the internal path, whose
    // guards require a connected wallet - switching there would strand the
    // widget on "Waiting for a quote" with no error to explain it.
    const isQuotableWithoutWallet = ctx.targetToken?.isIntent === false;

    if (
      !!walletAddress ||
      !canBeToggled ||
      !isQuotableWithoutWallet ||
      ctx.isDepositFromExternalWallet
    ) {
      return;
    }

    applyDepositType(true);
  }, [
    walletAddress,
    canBeToggled,
    ctx.targetToken?.isIntent,
    ctx.isDepositFromExternalWallet,
  ]);

  const onToggle = (isExternal: boolean) => {
    if (!canBeToggled && !canConnectWallet) {
      return;
    }

    if (canConnectWallet) {
      setPendingIsExternal(isExternal);
      walletSignIn();

      return;
    }

    setPendingIsExternal(null);
    applyDepositType(isExternal);
  };

  return (
    <Card
      padding="none"
      className={cn('flex flex-col py-sw-lg px-sw-xl', className)}>
      <header className="gap-sw-md flex items-center justify-between">
        <QrCodeIcon size={16} className="text-sw-gray-200" />
        <span className="text-sw-label-md text-sw-gray-200">
          {mode === 'deposit'
            ? t('deposit.method.switcher.label', 'Deposit from external wallet')
            : t(
                'deposit.method.switcher.labelSwap',
                'Swap from external wallet',
              )}
        </span>
        <Tooltip
          className="mr-auto"
          text={t(
            'deposit.external.tooltip.text',
            'Generate a deposit address and QR code to send funds to. Send any amount of the selected asset and it will be credited to the specified address.',
          )}
        />

        <Tooltip
          isDisabled={canBeToggled}
          text={(() => {
            if (canBeToggled || canConnectWallet) {
              return '';
            }

            if (!ctx.sourceToken) {
              return t(
                'deposit.method.switcher.tooltip.noToken',
                'Select a token to deposit first.',
              );
            }

            if (!ctx.targetToken && mode === 'swap') {
              return t(
                'deposit.method.switcher.tooltip.noTargetToken',
                'Select a token to receive first.',
              );
            }

            if (mode === 'swap' && isIntentSelectionUnsupported) {
              return t(
                'deposit.method.switcher.tooltip.intents',
                'External wallet swaps aren’t available for Near Intents assets.',
              );
            }

            return t(
              'deposit.method.switcher.tooltip.virtualChain',
              'External wallet deposits aren’t available for this asset.',
            );
          })()}>
          <span tabIndex={canBeToggled ? undefined : 0} className="flex">
            <Toggle
              isOn={ctx.isDepositFromExternalWallet}
              isDisabled={!canBeToggled && !canConnectWallet}
              onToggle={onToggle}
            />
          </span>
        </Tooltip>
      </header>

      {isVirtualChainSource && (
        <div className="pt-sw-md gap-sw-xxs text-sw-label-sm text-sw-gray-200 flex flex-col">
          <p>
            {t('deposit.method.switcher.virtualChainDisabled', {
              defaultValue:
                'External wallet deposits aren’t available on the {{chain}} network.',
              chain: ctx.sourceToken?.chainName ?? 'Aurora',
            })}
          </p>
          <p>
            {t(
              'deposit.method.switcher.disabledHint',
              'Deposit directly from your connected wallet.',
            )}
          </p>
        </div>
      )}

      {ctx.isDepositFromExternalWallet && !isVirtualChainSource && (
        <ExtendedContent mode={mode} onMsg={onMsg} />
      )}
    </Card>
  );
};
