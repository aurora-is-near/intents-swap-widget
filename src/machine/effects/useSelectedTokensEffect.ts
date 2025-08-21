import { useEffect, useMemo } from 'react';

import { useConfig } from '@/config';
import { useTokens } from '@/hooks/useTokens';
import { useIntentsBalance } from '@/hooks/useIntentsBalance';
import { getMainTokenByChain } from '@/utils/tokens/getMainTokenByChain';
import { getDefaultCalyxToken } from '@/utils/tokens/getDefaultCalyxToken';
import { getTokenWithHighBalance } from '@/utils/tokens/getTokenWithHighBalance';

import { fireEvent } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';

import type { ListenerProps } from './types';

export const useSelectedTokensEffect = ({ isEnabled }: ListenerProps) => {
  const { tokens } = useTokens();
  const { ctx, state } = useUnsafeSnapshot();
  const { intentBalances } = useIntentsBalance();
  const { walletSupportedChains, chainsFilter } = useConfig();

  const highestCalyxToken = getTokenWithHighBalance({
    tokens,
    walletSupportedChains,
    balances: intentBalances,
    across: 'intents',
  });

  const [sourceToken, targetToken] = useMemo(() => {
    if (state === 'initial_dry' || state === 'input_valid_dry') {
      const defaultCalyxToken = getDefaultCalyxToken({ tokens });

      return [
        { token: defaultCalyxToken, status: 'loaded' },
        { token: undefined, status: 'loaded' },
      ] as const;
    }

    if (chainsFilter.source.calyx !== 'none') {
      if (!highestCalyxToken) {
        return [
          { token: undefined, status: 'loading' },
          { token: undefined, status: 'loading' },
        ] as const;
      }

      return [
        { token: highestCalyxToken, status: 'loaded' },
        { token: undefined, status: 'loaded' },
      ] as const;
    }

    const mainExternalToken = getMainTokenByChain({
      tokens,
      walletSupportedChains,
    });

    return [
      { token: mainExternalToken, status: 'loaded' },
      { token: undefined, status: 'loaded' },
    ] as const;
  }, [tokens, chainsFilter, highestCalyxToken, walletSupportedChains, state]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const isGuardedState = guardStates(ctx, ['initial_dry', 'initial_wallet']);

    if (isGuardedState) {
      if (sourceToken.status === 'loaded' && !ctx.sourceToken) {
        fireEvent('tokenSelect', {
          variant: 'source',
          token: sourceToken.token,
        });
      }

      if (targetToken.status === 'loaded' && !ctx.targetToken) {
        fireEvent('tokenSelect', {
          variant: 'target',
          token: targetToken.token,
        });
      }
    }
  }, [ctx, sourceToken, targetToken, isEnabled]);

  return { source: ctx.sourceToken, target: ctx.targetToken };
};
