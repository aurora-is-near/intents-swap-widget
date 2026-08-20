import type { ChangeEvent } from 'react';

import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Banner } from '@/components/Banner';

import { cn } from '@/utils';
import { fireEvent } from '@/machine';
import { isValidChainAddress } from '@/utils/checkers/isValidChainAddress';
import { useTypedTranslation } from '@/localisation';
import { useUnsafeSnapshot } from '@/machine/snap';
import { CHAINS_LIST } from '@/constants/chains';

type Props = {
  className?: string;
};

export const RefundAddressField = ({ className }: Props) => {
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
    <Card
      padding="none"
      className={cn(
        'flex flex-col px-sw-xl py-sw-lg rounded-sw-md',
        className,
      )}>
      <header className="flex items-center justify-between w-full pb-sw-md">
        <h5 className="text-sw-label-md text-sw-gray-600 mr-auto!">
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
        </h5>
        {notification && (
          <Banner
            iconPosition="right"
            variant={notification.variant}
            message={notification.message}
          />
        )}
      </header>
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
    </Card>
  );
};
