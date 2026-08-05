import type { ChangeEvent } from 'react';

import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';

import { cn } from '@/utils';
import { fireEvent } from '@/machine';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';
import { isValidChainAddress } from '@/utils/checkers/isValidChainAddress';
import { CHAINS_LIST } from '@/constants/chains';

type Props = {
  className?: string;
};

export const RefundAddressStep = ({ className }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    fireEvent('refundToAddressSet', e.target.value);
  };

  const chain = ctx.sourceToken
    ? (CHAINS_LIST[ctx.sourceToken.blockchain]?.label ??
      ctx.sourceToken.blockchain.toUpperCase())
    : undefined;

  const notification = (() => {
    if (!ctx.sourceToken) {
      return undefined;
    }

    // Validated locally rather than from `ctx.error`: the machine holds a
    // single error slot, so a higher-priority send address error would
    // otherwise mask this input's own feedback while the user types.
    if (
      ctx.refundToAddress &&
      isValidChainAddress(ctx.sourceToken.blockchain, ctx.refundToAddress) !==
        true
    ) {
      return {
        variant: 'error' as const,
        state: 'error' as const,
        message: t('refundAddress.error.invalidAddress', {
          defaultValue: 'Invalid {{chain}} address format',
          chain,
        }),
      };
    }

    return undefined;
  })();

  return (
    <div className={cn('flex flex-col gap-y-sw-xl', className)}>
      <div className="flex items-center justify-between py-sw-md">
        <span className="flex items-center shrink-0 justify-center gap-y-sw-lg h-[28px] w-[28px] rounded-full bg-sw-gray-50 text-sw-gray-950 text-sw-label-sm">
          2
        </span>
        <div className="flex flex-col gap-sw-xs mr-auto ml-sw-lg w-full">
          <span className="flex items-center justify-between text-sw-label-md text-sw-gray-50">
            {(() => {
              const isPrompt = !ctx.refundToAddress && !notification;

              if (!isPrompt) {
                // short so notification can be displayed on the same line
                return t('refundAddress.label', 'Refund to');
              }

              return ctx.sourceToken
                ? t('refundAddress.message.promptWithChain', {
                    defaultValue: 'Refund to address on {{chain}}',
                    chain,
                  })
                : t('refundAddress.message.prompt', 'Refund to address');
            })()}
            {notification && (
              <Banner
                iconPosition="right"
                variant={notification.variant}
                message={notification.message}
              />
            )}
          </span>
          {ctx.sourceToken ? (
            <Input
              fontSize="sm"
              defaultValue={ctx.refundToAddress}
              state={
                ctx.externalDepositTxReceived
                  ? 'disabled'
                  : (notification?.state ?? 'default')
              }
              placeholder={t(
                'refundAddress.placeholder',
                'Enter refund wallet address',
              )}
              onChange={onChange}
            />
          ) : (
            <span className="text-sw-label-sm text-sw-gray-200">
              {t('refundAddress.message.promptChain', {
                defaultValue:
                  'Refund to this address on {{chain}} network if fails',
                chain,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
