import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { Input } from '@/components/Input';
import type { Banner } from '@/components/Banner';

import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useTypedTranslation } from '@/localisation';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { CHAINS_LIST, EVM_CHAINS } from '@/constants/chains';

type Notification =
  | {
      message: string;
      state: ComponentProps<typeof Input>['state'];
      variant: ComponentProps<typeof Banner>['variant'];
    }
  | undefined;

export const useNotification = (
  userError: string | undefined,
): Notification => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains, appName, sendAddress } = useConfig();

  return useMemo(() => {
    if (sendAddress) {
      return undefined;
    }

    if (ctx.sendAddress && userError) {
      return {
        variant: 'error',
        state: 'error',
        message: userError,
      };
    }

    if (!ctx.targetToken) {
      return {
        variant: 'warn' as const,
        state: 'disabled' as const,
        message: t(
          'wallet.recipient.info.selectToken',
          'Select a token to receive',
        ),
      };
    }

    // known address errors
    if (
      ctx.error &&
      ctx.quoteStatus === 'error' &&
      ctx.error.code === 'TOKEN_IS_NOT_SUPPORTED'
    ) {
      return {
        variant: 'error',
        state: 'error',
        message: t('wallet.recipient.error.invalidAddress', {
          defaultValue: 'Invalid address. Use one on {{network}} network.',
          network: CHAINS_LIST[ctx.targetToken.blockchain]?.label ?? 'selected',
        }),
      };
    }

    const chainLabel = (EVM_CHAINS as ReadonlyArray<string>).includes(
      ctx.targetToken.blockchain,
    )
      ? 'EVM'
      : ctx.targetToken.blockchain.toUpperCase();

    if (
      !ctx.targetToken.isIntent &&
      !walletSupportedChains.includes(ctx.targetToken.blockchain)
    ) {
      return {
        variant: 'warn',
        state: 'default',
        message: t('wallet.recipient.warn.compatibleNetwork', {
          defaultValue:
            'Make sure the address is on the {{chainLabel}} compatible network',
          chainLabel,
        }),
      };
    }

    if (!ctx.targetToken.isIntent && ctx.walletAddress !== ctx.sendAddress) {
      return {
        variant: 'warn',
        state: 'default',
        message: t('wallet.recipient.warn.compatibleNetwork', {
          defaultValue:
            'Make sure the address is on the {{chainLabel}} compatible network',
          chainLabel,
        }),
      };
    }

    if (
      ctx.walletAddress === ctx.sendAddress &&
      walletSupportedChains.includes(ctx.targetToken.blockchain)
    ) {
      return {
        variant: 'success',
        state: 'default',
        message: t('wallet.recipient.message.networkVerified', {
          defaultValue:
            'Address verified for {{chainLabel}} compatible network',
          chainLabel,
        }),
      };
    }

    if (!ctx.walletAddress && !ctx.sendAddress) {
      return {
        variant: 'error',
        state: 'error',
        message: t(
          'wallet.recipient.message.receiveFunds',
          'Please enter wallet address to receive funds',
        ),
      };
    }

    if (
      ctx.sendAddress &&
      ctx.targetToken.isIntent &&
      ctx.sendAddress ===
        getIntentsAccountId({
          walletAddress: ctx.sendAddress,
          addressType: 'evm',
        })
    ) {
      return {
        variant: 'success',
        state: 'default',
        message: t('wallet.recipient.message.receiveFunds', {
          defaultValue: 'You will receive funds on your {{appName}} account',
          appName,
        }),
      };
    }
  }, [ctx, userError, walletSupportedChains]);
};
