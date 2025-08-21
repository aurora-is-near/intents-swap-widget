import { useMemo } from 'react';
import type { ComponentProps } from 'react';

import type { Input } from '@/components/Input';
import type { Banner } from '@/components/Banner';

import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';
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
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains } = useConfig();

  return useMemo(() => {
    if (ctx.sendAddress && userError) {
      return {
        variant: 'error',
        state: 'error',
        message: userError,
      };
    }

    if (!ctx.targetToken) {
      return {
        variant: 'info' as const,
        state: 'disabled' as const,
        message: 'Select a token to receive',
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
        message: `Invalid address. Use one on ${CHAINS_LIST[ctx.targetToken.blockchain]?.label ?? 'selected'} network.`,
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
        message: `Make sure the address is on the ${chainLabel} compatible network`,
      };
    }

    if (!ctx.targetToken.isIntent && ctx.walletAddress !== ctx.sendAddress) {
      return {
        variant: 'warn',
        state: 'default',
        message: `Make sure the address is on the ${chainLabel} compatible network`,
      };
    }

    if (
      ctx.walletAddress === ctx.sendAddress &&
      walletSupportedChains.includes(ctx.targetToken.blockchain)
    ) {
      return {
        variant: 'success',
        state: 'default',
        message: `Address verified for ${chainLabel} compatible network`,
      };
    }

    if (!ctx.walletAddress && !ctx.sendAddress) {
      return {
        variant: 'error',
        state: 'error',
        message: 'Please enter wallet address to receive funds',
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
        message: 'You will receive funds on your Calyx account',
      };
    }
  }, [ctx, userError, walletSupportedChains]);
};
