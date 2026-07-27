import type { ChangeEvent } from 'react';

import { Card } from '@/components/Card';
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

export const RefundAddress = ({ className }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    fireEvent('refundToAddressSet', e.target.value);
  };

  const notification = (() => {
    if (!ctx.sourceToken) {
      return {
        variant: 'warn' as const,
        state: 'disabled' as const,
        message: t('refundAddress.info.selectToken', 'Select a token to send'),
      };
    }

    const chain =
      CHAINS_LIST[ctx.sourceToken.blockchain]?.label ??
      ctx.sourceToken.blockchain.toUpperCase();

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

    if (!ctx.refundToAddress) {
      return {
        variant: 'info' as const,
        state: 'default' as const,
        message: t('refundAddress.message.prompt', {
          defaultValue:
            'Refunds are sent to this address on the {{chain}} network if the transfer fails',
          chain,
        }),
      };
    }

    return undefined;
  })();

  return (
    <Card className={cn('flex flex-col', className)}>
      <h5 className="text-sw-label-md text-sw-gray-50 pb-sw-md">
        {t('refundAddress.label', 'Refund to')}
      </h5>
      <Input
        fontSize="sm"
        defaultValue={ctx.refundToAddress}
        state={
          ctx.externalDepositTxReceived
            ? 'disabled'
            : (notification?.state ?? 'default')
        }
        className="mb-sw-md"
        placeholder={t(
          'refundAddress.placeholder',
          'Enter refund wallet address',
        )}
        onChange={onChange}
      />

      {notification && (
        <Banner variant={notification.variant} message={notification.message} />
      )}
    </Card>
  );
};
