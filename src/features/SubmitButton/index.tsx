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
import type { QuoteTransferArgs } from '@/hooks/useMakeQuoteTransfer';
import type { IntentsTransferArgs } from '@/hooks/useMakeIntentsTransfer';

type Msg = { type: 'on_successful_transfer'; transfer: TransferResult };

type Props = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg: (msg: Msg) => void;
  };

const commonBtnProps = {
  size: 'lg' as const,
  variant: 'primary' as const,
};

const useGetErrorButton = (ctx: Context) => {
  const { t } = useTypedTranslation();

  if (ctx.error?.code === 'SOURCE_BALANCE_INSUFFICIENT') {
    return (
      <Button state="error" {...commonBtnProps}>
        {t('submit.error.insufficientBalance', 'Insufficient balance')}
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
        {ctx.error.meta?.message && (
          <ErrorMessage>{ctx.error.meta.message}</ErrorMessage>
        )}
      </div>
    );
  }

  if (ctx.error?.code === 'DIRECT_TRANSFER_ERROR') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          {t('submit.error.transferFailed.label', 'Transfer failed')}
        </Button>
        {ctx.error.meta?.message && (
          <ErrorMessage>{ctx.error.meta.message}</ErrorMessage>
        )}
      </div>
    );
  }
};

const SubmitButtonError = () => {
  const { ctx } = useUnsafeSnapshot();

  return useGetErrorButton(ctx);
};

const SubmitButtonBase = ({ providers, makeTransfer, onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();
  const {
    isDirectTransfer,
    isNearToIntentsSameAssetTransfer,
    isDirectNearDeposit,
  } = useComputedSnapshot();

  const { make } = useMakeTransfer({ providers, makeTransfer });

  const SubmitErrorButton = useGetErrorButton(ctx);

  const getMainLabel = () => {
    if (
      isDirectTransfer ||
      isNearToIntentsSameAssetTransfer ||
      isDirectNearDeposit
    ) {
      return t('submit.active.transfer', 'Transfer');
    }

    return ctx.sourceToken?.isIntent && ctx.targetToken?.isIntent
      ? t('submit.active.internal', 'Swap')
      : t('submit.active.external', 'Swap & send');
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
    !isNearToIntentsSameAssetTransfer &&
    !isDirectNearDeposit
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

export const SubmitButton = Object.assign(SubmitButtonBase, {
  Error: SubmitButtonError,
});
