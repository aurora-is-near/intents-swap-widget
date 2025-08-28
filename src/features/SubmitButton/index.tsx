import { Button } from '@/components/Button';
import { TinyNumber } from '@/components/TinyNumber';
import { ErrorMessage } from '@/components/ErrorMessage';

import { useConfig } from '@/config';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import type { TransferResult } from '@/types/transfer';
import type { Context } from '@/machine/context';

import { useMakeTransfer } from '@/hooks/useMakeTransfer';
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

export const getErrorButton = (ctx: Context) => {
  if (ctx.error?.code === 'SOURCE_BALANCE_INSUFFICIENT') {
    return (
      <Button state="error" {...commonBtnProps}>
        Insufficient balance
      </Button>
    );
  }

  if (ctx.error?.code === 'TOKEN_IS_NOT_SUPPORTED') {
    return (
      <Button state="error" {...commonBtnProps}>
        Invalid address
      </Button>
    );
  }

  if (ctx.error?.code === 'QUOTE_AMOUNT_IS_TOO_LOW') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          Amount is too low
        </Button>
        <ErrorMessage>
          Amount you entered is very low. Please try increasing it{' '}
          <span className="text-nowrap">
            above <TinyNumber value={ctx.error.meta.minAmount ?? '0'} />{' '}
            {ctx.sourceToken?.symbol ?? ''}.
          </span>
        </ErrorMessage>
      </div>
    );
  }

  // other quote errors
  if (ctx.quoteStatus === 'error') {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="error" {...commonBtnProps}>
          Quote failed
        </Button>
        <ErrorMessage>
          We couldn’t finalize your quote. Please try again or adjust your
          values.
        </ErrorMessage>
      </div>
    );
  }
};

const SubmitButtonError = () => {
  const { ctx } = useUnsafeSnapshot();

  return getErrorButton(ctx);
};

const SubmitButtonBase = ({ providers, makeTransfer, onMsg }: Props) => {
  const { appName } = useConfig();
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();

  const { make } = useMakeTransfer({ providers, makeTransfer });

  const getMainLabel = () => {
    if (isDirectTransfer) {
      return 'Transfer';
    }

    return ctx.sourceToken?.isIntent && ctx.targetToken?.isIntent
      ? 'Swap'
      : 'Swap & send';
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

  if (
    ctx.targetToken &&
    ctx.sourceToken &&
    ctx.targetToken.isIntent &&
    ctx.sourceToken.assetId === ctx.targetToken.assetId
  ) {
    return (
      <div className="gap-sw-md flex flex-col">
        <Button state="disabled" {...commonBtnProps}>
          Not possible
        </Button>
        <ErrorMessage variant="dimmed">
          It's temporary not possible to deposit the same asset on Near to
          {appName}. Please select another asset or swap first.
        </ErrorMessage>
      </div>
    );
  }

  const SubmitErrorButton = getErrorButton(ctx);

  if (SubmitErrorButton) {
    return SubmitErrorButton;
  }

  if (ctx.transferStatus.status === 'pending') {
    switch (ctx.transferStatus.reason) {
      case 'WAITING_CONFIRMATION':
        return (
          <Button state="loading" {...commonBtnProps}>
            Confirm in wallet
          </Button>
        );
      case 'PROCESSING':
      default:
        return (
          <Button state="loading" {...commonBtnProps}>
            Finalizing transfer
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
                return 'Transfer fees could not be estimated.';
              default:
                return 'Transfer can not be completed.';
            }
          })()}
        </ErrorMessage>
      </div>
    );
  }

  if (ctx.quoteStatus === 'pending') {
    return (
      <Button state="loading" {...commonBtnProps}>
        Finalizing quote
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

  if (!ctx.quote && !isDirectTransfer) {
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
