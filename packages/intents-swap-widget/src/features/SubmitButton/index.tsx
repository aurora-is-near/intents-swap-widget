import { Trans } from 'react-i18next';
import WalletPlusIcon from 'reicon-react/icons/WalletPlus';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import type { FC } from 'react';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { fireEvent } from '@/machine';
import { useTypedTranslation } from '@/localisation';

import type { MakeTransfer, TransferResult } from '@/types/transfer';

import { Button } from '@/components/Button';
import { TinyNumber } from '@/components/TinyNumber';
import { StatusMessage } from '@/components/StatusMessage';

import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { Context } from '@/machine/context';
import { isBalanceSufficient } from '@/machine/guards/checks/isBalanceSufficient';

import { useSwitchChain } from '@/hooks/useSwitchChain';
import { useMakeTransfer } from '@/hooks/useMakeTransfer';
import { useWalletConnection } from '@/hooks/useWalletConnection';

import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import {
  isFullGasTokenAmount,
  isNearlyFullGasTokenAmount,
} from '@/utils/checkers/isFullGasTokenAmount';

type Props = {
  label: string;
  onSuccess: (transfer: TransferResult) => void;
  makeTransfer?: MakeTransfer;
};

const commonBtnProps = {
  size: 'lg' as const,
  variant: 'primary' as const,
};

const isSourceBalanceInsufficient = (ctx: Context): boolean =>
  !ctx.isDepositFromExternalWallet &&
  !!ctx.sourceToken &&
  isNotEmptyAmount(ctx.sourceTokenAmount) &&
  isNotEmptyAmount(ctx.sourceTokenBalance) &&
  !isBalanceSufficient(ctx);

const useGetErrorButton = (ctx: Context) => {
  const { apiKey, sendAddress, fetchQuote } = useConfig();
  const { t } = useTypedTranslation();

  if (
    !!sendAddress &&
    ctx.sendAddress !== sendAddress &&
    ctx.state === 'quote_success_external'
  ) {
    return (
      <Button state="error" {...commonBtnProps}>
        {t(
          'submit.error.sendToAddressOverridden',
          'Overridden recipient address',
        )}
      </Button>
    );
  }

  if (ctx.error?.code === 'TOKEN_IS_NOT_SUPPORTED') {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.invalidAddress', 'Invalid address')}
      </Button>
    );
  }

  if (
    (ctx.state === 'initial_wallet' || ctx.state === 'initial_dry') &&
    ctx.error?.code === 'SEND_ADDRESS_IS_EMPTY'
  ) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {t('submit.disabled.enterRecipientAddress', 'Enter recipient address')}
      </Button>
    );
  }

  if (
    (ctx.state === 'initial_wallet' || ctx.state === 'initial_dry') &&
    ctx.error?.code === 'SEND_ADDRESS_IS_NOT_FOUND'
  ) {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.sendAddressNotFound', {
          defaultValue: 'Address not found on {{chain}}',
          chain: ctx.error.meta.chain.toUpperCase(),
        })}
      </Button>
    );
  }

  if (
    (ctx.state === 'initial_wallet' || ctx.state === 'initial_dry') &&
    ctx.error?.code === 'SEND_ADDRESS_IS_INVALID'
  ) {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.sendAddressInvalid', {
          defaultValue: 'Invalid {{chain}} address',
          chain: ctx.error.meta.chain.toUpperCase(),
        })}
      </Button>
    );
  }

  if (
    (ctx.state === 'initial_wallet' || ctx.state === 'initial_dry') &&
    ctx.error?.code === 'REFUND_ADDRESS_IS_EMPTY'
  ) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {t('submit.error.refundAddressEmpty', 'Enter refund address')}
      </Button>
    );
  }

  if (
    (ctx.state === 'initial_wallet' || ctx.state === 'initial_dry') &&
    ctx.error?.code === 'REFUND_ADDRESS_IS_INVALID'
  ) {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.refundAddressInvalid', 'Invalid refund address')}
      </Button>
    );
  }

  if (
    ctx.error?.code === 'QUOTE_AMOUNT_IS_TOO_LOW' ||
    ctx.error?.code === 'MIN_WITHDRAWAL_AMOUNT_ERROR'
  ) {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.amountTooLow.label', 'Amount is too low')}
        </Button>
        <StatusMessage>
          <Trans i18nKey="submit.error.amountTooLow.message">
            Amount you entered is very low. Please try increasing it{' '}
            <span className="text-nowrap">
              above <TinyNumber value={ctx.error.meta.minAmount ?? '0'} />{' '}
              {ctx.sourceToken?.symbol ?? ''}.
            </span>
          </Trans>
        </StatusMessage>
      </div>
    );
  }

  if (ctx.error?.code === 'QUOTE_WIDGET_API_KEY_IS_INVALID') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.apiKeyInvalid', 'Invalid API key')}
        </Button>
        <StatusMessage>
          {t(
            'submit.error.apiKeyInvalid.message',
            'Please contact support if the problem persists.',
          )}
        </StatusMessage>
      </div>
    );
  }

  // other quote errors
  if (ctx.quoteStatus === 'error') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.quoteFailed.label', 'Quote failed')}
        </Button>
        <StatusMessage>
          {t(
            'submit.error.quoteFailed.message',
            'We couldn’t finalize your quote. Please try again or adjust your values.',
          )}
        </StatusMessage>
      </div>
    );
  }

  // transfer errors
  if (ctx.error?.code === 'TRANSFER_INVALID_INITIAL') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.invalidTransferData.label', 'Invalid transfer data')}
        </Button>
        {ctx.error.meta?.message ? (
          <StatusMessage>{ctx.error.meta.message}</StatusMessage>
        ) : null}
      </div>
    );
  }

  if (ctx.error?.code === 'EXTERNAL_TRANSFER_FAILED') {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.externalTransferFailed.label', 'Transfer failed')}
      </Button>
    );
  }

  // An incomplete deposit is refunded and leaves nothing to recover, so the way
  // out is a new deposit address rather than a dead error button.
  if (ctx.error?.code === 'EXTERNAL_TRANSFER_INCOMPLETE') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button
          {...commonBtnProps}
          onClick={() => fireEvent('retryExternalDeposit', null)}>
          {t('submit.error.externalTransferFailed.retry', 'Get another quote')}
        </Button>
        <StatusMessage>
          {t(
            'submit.error.externalTransferFailed.incompleteMessage',
            'Incomplete transfer. Deposited amount will be refunded.',
          )}
        </StatusMessage>
      </div>
    );
  }

  if (ctx.error?.code === 'EXTERNAL_TRANSFER_REFUNDED') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.externalTransferFailed.label', 'Transfer failed')}
        </Button>
        <StatusMessage>
          {t(
            'submit.error.externalTransferFailed.refundedMessage',
            'Deposited amount will be refunded.',
          )}
        </StatusMessage>
      </div>
    );
  }

  if (ctx.error?.code === 'DIRECT_TRANSFER_ERROR') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.transferFailed.label', 'Transfer failed')}
        </Button>
        {ctx.error.meta?.message ? (
          <StatusMessage>{ctx.error.meta.message}</StatusMessage>
        ) : null}
      </div>
    );
  }

  if (
    ctx.error?.code === 'SOURCE_BALANCE_INSUFFICIENT' ||
    isSourceBalanceInsufficient(ctx)
  ) {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.insufficientBalance', 'Insufficient balance')}
      </Button>
    );
  }

  if (
    (ctx.state === 'input_valid_dry' ||
      ctx.state === 'input_valid_internal' ||
      ctx.state === 'input_valid_external') &&
    !fetchQuote &&
    !apiKey
  ) {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.apiKeyRequired', 'API key is required')}
        </Button>
        <StatusMessage>
          <Trans i18nKey="submit.error.apiKeyRequired.message">
            Visit{' '}
            <span className="inline-flex items-center gap-sw-xs px-sw-xs">
              <a
                className="underline"
                href="https://studio.aurora.dev"
                rel="noopener noreferrer"
                target="_blank">
                studio.aurora.dev
              </a>
              <OpenInNew size={12} />
            </span>{' '}
            to get your app key.
          </Trans>
        </StatusMessage>
      </div>
    );
  }
};

const SubmitButtonError: FC = () => {
  const { ctx } = useUnsafeSnapshot();

  return useGetErrorButton(ctx) ?? null;
};

const ConnectWalletButton = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { walletSignIn } = useWalletConnection();

  const SubmitErrorButton = useGetErrorButton(ctx);

  if (SubmitErrorButton) {
    return SubmitErrorButton;
  }

  return (
    <Button
      state={walletSignIn ? 'default' : 'disabled'}
      {...commonBtnProps}
      onClick={walletSignIn}
      icon={WalletPlusIcon}>
      {t('submit.error.connectWallet', 'Connect wallet')}
    </Button>
  );
};

const SubmitButtonBase = (props: Props) => {
  const { providers, plugins } = useConfig();

  const { makeTransfer, onSuccess } = props;
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();
  const {
    isNativeNearDeposit,
    isDirectTokenOnNearDeposit,
    isDirectNearTokenWithdrawal,
  } = useComputedSnapshot();

  const { make } = useMakeTransfer({
    providers,
    plugins,
    makeTransfer,
  });

  const { isSwitchingChainRequired, switchChain, isSwitchingChain } =
    useSwitchChain({ providers });

  const SubmitErrorButton = useGetErrorButton(ctx);

  const onClick = async () => {
    // Check if chain switch is needed before transfer
    if (isSwitchingChainRequired) {
      const switched = await switchChain();

      if (!switched) {
        return; // User cancelled or error occurred
      }
    }

    let transferResult: TransferResult | undefined;

    try {
      transferResult = await make();
    } catch (error) {
      logger.error('Unexpected error during submit', error);
    }

    if (transferResult) {
      onSuccess(transferResult);
    }
  };

  if (isSourceBalanceInsufficient(ctx)) {
    return SubmitErrorButton;
  }

  if (!ctx.targetToken) {
    return (
      <Button {...commonBtnProps} state="disabled">
        {t('submit.disabled.selectTokenToReceive', 'Select token to receive')}
      </Button>
    );
  }

  if (!isNotEmptyAmount(ctx.sourceTokenAmount)) {
    return (
      <Button {...commonBtnProps} state="disabled">
        {t('submit.disabled.enterAmount', 'Enter amount')}
      </Button>
    );
  }

  if (ctx.areInputsValidating) {
    return (
      <Button state="loading" {...commonBtnProps}>
        {t('submit.pending.validating', 'Validating...')}
      </Button>
    );
  }

  // Show switching state while chain is being switched
  if (isSwitchingChain) {
    return (
      <Button state="loading" {...commonBtnProps}>
        {t('submit.pending.switchingChain', 'Switching network...')}
      </Button>
    );
  }

  // Chain switching required - skip error checks
  // because balance/errors are checked on current chain, not target chain
  // The onClick handler will automatically switch the chain before proceeding
  if (!isSwitchingChainRequired && SubmitErrorButton) {
    return SubmitErrorButton;
  }

  if (ctx.transferStatus.status === 'pending') {
    switch (ctx.transferStatus.reason) {
      case 'WAITING_CONFIRMATION':
        return (
          <Button state="loading" {...commonBtnProps}>
            {t('submit.pending.transfer.confirmInWallet', 'Confirm in wallet')}
          </Button>
        );
      case 'PROCESSING':
      default:
        return (
          <Button state="loading" {...commonBtnProps}>
            {t('submit.pending.transfer.finalizing', 'Finalizing transfer')}
          </Button>
        );
    }
  }

  if (ctx.transferStatus.status === 'error') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button {...commonBtnProps}>{props.label}</Button>
        <StatusMessage>
          {(() => {
            switch (ctx.error?.code) {
              case 'FEES_NOT_ESTIMATED':
                return t(
                  'submit.error.transfer.noFees',
                  'Transfer fees could not be estimated.',
                );
              case 'QUOTE_ERROR':
                return ctx.error.meta.message;
              case 'TRANSFER_REJECTED_UNKNOWN':
                return isFullGasTokenAmount(ctx)
                  ? t('submit.error.transfer.rejectedFullGasBalance', {
                      defaultValue:
                        'Your wallet rejected the transfer. Leave some {{symbol}} to cover the network fee.',
                      symbol: ctx.sourceToken?.symbol,
                    })
                  : t(
                      'submit.error.transfer.rejectedUnknown',
                      'Your wallet rejected the transfer.',
                    );
              default:
                return t(
                  'submit.error.transfer.failed',
                  'Transfer can not be completed.',
                );
            }
          })()}
        </StatusMessage>
      </div>
    );
  }

  if (ctx.quoteStatus === 'pending') {
    return (
      <Button state="loading" {...commonBtnProps}>
        {ctx.quote
          ? t('submit.pending.quote.refreshing', 'Refreshing quote')
          : t('submit.pending.quote.finalizing', 'Finalizing quote')}
      </Button>
    );
  }

  if (ctx.error) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {props.label}
      </Button>
    );
  }

  if (
    !ctx.quote &&
    !isDirectTokenOnNearDeposit &&
    !isDirectNearTokenWithdrawal &&
    !isNativeNearDeposit
  ) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {props.label}
      </Button>
    );
  }

  return (
    <Button {...commonBtnProps} onClick={onClick}>
      {props.label}
    </Button>
  );
};

// Full button logic - only runs when wallet is connected
const SubmitButtonWithWallet = (props: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const errorButton = useGetErrorButton(ctx);

  // 1. Has errors? Show error button
  if (errorButton) {
    return errorButton;
  }

  // 2. External deposit (QR code) mode? Show waiting/processing state
  if (ctx.isDepositFromExternalWallet) {
    if (!ctx.sourceToken) {
      return (
        <Button {...commonBtnProps} state="disabled">
          {t('submit.disabled.selectTokenToDeposit', 'Select token to deposit')}
        </Button>
      );
    }

    if (!ctx.targetToken) {
      return (
        <Button {...commonBtnProps} state="disabled">
          {t('submit.disabled.selectTokenToReceive', 'Select token to receive')}
        </Button>
      );
    }

    if (!ctx.walletAddress && !ctx.refundToAddress) {
      return (
        <Button {...commonBtnProps} state="disabled">
          {t('submit.error.refundAddressEmpty', 'Enter refund address')}
        </Button>
      );
    }

    if (!ctx.quote) {
      return (
        <Button {...commonBtnProps} state="loading">
          {t('submit.disabled.waitingForQuote', 'Waiting for a quote')}
        </Button>
      );
    }

    if (ctx.externalDepositTxReceived) {
      return (
        <Button state="loading" {...commonBtnProps}>
          {t('submit.pending.externalDeposit.processing', 'Processing')}
        </Button>
      );
    }

    return (
      <Button state="loading" {...commonBtnProps}>
        {t('submit.pending.externalDeposit.waiting', 'Waiting for transaction')}
      </Button>
    );
  }

  if (!ctx.sourceToken) {
    return <SubmitButtonBase {...props} />;
  }

  // 3. All good - show active button
  return isNearlyFullGasTokenAmount(ctx) ? (
    <div className="gap-sw-md flex flex-col">
      <SubmitButtonBase {...props} />
      <StatusMessage state="warning">
        {t('submit.warning.balanceMax.message', {
          symbol: ctx.sourceToken.symbol.toUpperCase(),
          defaultValue:
            'Make sure you keep enough {{symbol}} in your wallet to cover the network fee.',
        })}
      </StatusMessage>
    </div>
  ) : (
    <SubmitButtonBase {...props} />
  );
};

// Performant wrapper - minimal logic when no wallet, full logic when connected
const SubmitButton = (props: Props) => {
  const { ctx } = useUnsafeSnapshot();

  // 1. No wallet? Return lightweight button immediately (best performance)
  if (!ctx.walletAddress && !ctx.isDepositFromExternalWallet) {
    return <ConnectWalletButton />;
  }

  // 2. Has wallet - run full logic (call remaining hooks only when needed)
  return <SubmitButtonWithWallet {...props} />;
};

// Attach Error as static property for backward compatibility
SubmitButton.Error = SubmitButtonError;

export { SubmitButton };
