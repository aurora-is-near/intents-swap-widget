import { Trans } from 'react-i18next';
import { Button } from '@/components/Button';
import { TinyNumber } from '@/components/TinyNumber';
import { ErrorMessage } from '@/components/ErrorMessage';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

import { useTypedTranslation } from '@/localisation';
import { useMakeTransfer } from '@/hooks/useMakeTransfer';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { NATIVE_NEAR_DUMB_ASSET_ID, WNEAR_ASSET_ID } from '@/constants/tokens';
import type { QuoteTransferArgs } from '@/hooks/useMakeQuoteTransfer';
import type { IntentsTransferArgs } from '@/hooks/useMakeIntentsTransfer';

type Msg = { type: 'on_successful_transfer'; transfer: TransferResult };

type Props = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg: (msg: Msg) => void;
    externalSwapLabel: string;
    internalSwapLabel: string;
    transferLabel: string;
  };

const commonBtnProps = {
  size: 'lg' as const,
  variant: 'primary' as const,
};

const useGetErrorButton = (ctx: Context) => {
  const { t } = useTypedTranslation();

  if (ctx.error?.code === 'TOKEN_IS_NOT_SUPPORTED') {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.invalidAddress', 'Invalid address')}
      </Button>
    );
  }

  if (ctx.error?.code === 'QUOTE_AMOUNT_IS_TOO_LOW') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.amountTooLow.label', 'Amount is too low')}
        </Button>
        <ErrorMessage>
          <Trans i18nKey="submit.error.amountTooLow.message">
            Amount you entered is very low. Please try increasing it{' '}
            <span className="text-nowrap">
              above <TinyNumber value={ctx.error.meta.minAmount ?? '0'} />{' '}
              {ctx.sourceToken?.symbol ?? ''}.
            </span>
          </Trans>
        </ErrorMessage>
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
        <ErrorMessage>
          {t(
            'submit.error.quoteFailed.message',
            'We couldn’t finalize your quote. Please try again or adjust your values.',
          )}
        </ErrorMessage>
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
          <ErrorMessage>{ctx.error.meta.message}</ErrorMessage>
        ) : null}
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
          <ErrorMessage>{ctx.error.meta.message}</ErrorMessage>
        ) : null}
      </div>
    );
  }

  if (ctx.error?.code === 'SOURCE_BALANCE_INSUFFICIENT') {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.insufficientBalance', 'Insufficient balance')}
      </Button>
    );
  }
};

const SubmitButtonError = () => {
  const { ctx } = useUnsafeSnapshot();
  return useGetErrorButton(ctx) || null;
};

const SubmitButtonBase = ({
  providers,
  makeTransfer,
  onMsg,
  internalSwapLabel,
  externalSwapLabel,
  transferLabel,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();
  const {
    isDirectTransfer,
    isDirectNonNearWithdrawal,
    isNearToIntentsSameAssetTransfer,
    isDirectNearDeposit,
  } = useComputedSnapshot();

  const { make } = useMakeTransfer({ providers, makeTransfer });

  const SubmitErrorButton = useGetErrorButton(ctx);

  const nativeNearDeposit =
    ctx.sourceToken?.assetId === NATIVE_NEAR_DUMB_ASSET_ID &&
    ctx.targetToken?.assetId === WNEAR_ASSET_ID;

  const getMainLabel = () => {
    if (
      isDirectTransfer ||
      isDirectNonNearWithdrawal ||
      isNearToIntentsSameAssetTransfer ||
      isDirectNearDeposit ||
      nativeNearDeposit
    ) {
      return transferLabel;
    }

    return ctx.sourceToken?.isIntent && ctx.targetToken?.isIntent
      ? internalSwapLabel
      : externalSwapLabel;
  };

  const onClick = async () => {
    const transferResult = await make();

    if (transferResult) {
      onMsg({
        type: 'on_successful_transfer',
        transfer: transferResult,
      });
    }
  };

  if (!ctx.targetToken) {
    return (
      <Button {...commonBtnProps} state="disabled">
        Select token to receive
      </Button>
    );
  }

  if (!isNotEmptyAmount(ctx.sourceTokenAmount)) {
    return (
      <Button {...commonBtnProps} state="disabled">
        Enter amount
      </Button>
    );
  }

  if (SubmitErrorButton) {
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
        <Button {...commonBtnProps}>{getMainLabel()}</Button>
        <ErrorMessage>
          {(() => {
            switch (ctx.error?.code) {
              case 'FEES_NOT_ESTIMATED':
                return t(
                  'submit.error.transfer.noFees',
                  'Transfer fees could not be estimated.',
                );
              default:
                return t(
                  'submit.error.transfer.failed',
                  'Transfer can not be completed.',
                );
            }
          })()}
        </ErrorMessage>
      </div>
    );
  }

  if (ctx.quoteStatus === 'pending') {
    return (
      <Button state="loading" {...commonBtnProps}>
        {t('submit.pending.quote.finalizing', 'Finalizing quote')}
      </Button>
    );
  }

  if (ctx.error) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {getMainLabel()}
      </Button>
    );
  }

  if (
    !ctx.quote &&
    !isDirectTransfer &&
    !isDirectNonNearWithdrawal &&
    !isNearToIntentsSameAssetTransfer &&
    !isDirectNearDeposit &&
    !nativeNearDeposit
  ) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {getMainLabel()}
      </Button>
    );
  }

  return (
    <Button {...commonBtnProps} onClick={onClick}>
      {getMainLabel()}
    </Button>
  );
};

// Wrapper that handles all routing logic
const SubmitButton = (props: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  // Call ALL hooks first, before any conditional returns
  const errorButton = useGetErrorButton(ctx);

  // 1. No wallet? Show "Connect wallet" directly
  if (!ctx.walletAddress) {
    return (
      <Button state="disabled" {...commonBtnProps}>
        {t('submit.error.connectWallet', 'Connect wallet')}
      </Button>
    );
  }

  // 2. External deposit (QR code) mode? Hide button
  if (ctx.isDepositFromExternalWallet) {
    return null;
  }

  // 3. Has actual errors? Show error button
  if (errorButton) {
    return errorButton;
  }

  // 4. All good - show active button
  return <SubmitButtonBase {...props} />;
};

// Attach Error as static property for backward compatibility
SubmitButton.Error = SubmitButtonError;

export { SubmitButton };
