import { useEffect, useMemo } from 'react';

import { useConfig } from '@/config';
import { useTokens } from '@/hooks/useTokens';
import { useIntentsBalance } from '@/hooks/useIntentsBalance';
import { getMainTokenByChain } from '@/utils/tokens/getMainTokenByChain';
import { getDefaultIntentsToken } from '@/utils/tokens/getDefaultIntentsToken';
import { getTokenWithHighBalance } from '@/utils/tokens/getTokenWithHighBalance';

import { fireEvent } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';

import type { ListenerProps } from './types';

export const useSelectedTokensEffect = ({ isEnabled }: ListenerProps) => {
  const { tokens } = useTokens();
  const { ctx, state } = useUnsafeSnapshot();
  const { intentBalances } = useIntentsBalance();
  const { walletSupportedChains, chainsFilter, walletAddress } = useConfig();

  const highestIntentsToken = getTokenWithHighBalance({
    tokens,
    walletSupportedChains,
    balances: intentBalances,
    across: 'intents',
  });

  const [sourceToken, targetToken] = useMemo(() => {
    if (!walletAddress) {
      const defaultIntentsToken = getDefaultIntentsToken({ tokens });

      return [
        { token: defaultIntentsToken, status: 'loaded' },
        { token: undefined, status: 'loaded' },
      ] as const;
    }

    if (chainsFilter.source.intents !== 'none') {
      if (!highestIntentsToken) {
        return [
          { token: undefined, status: 'loading' },
          { token: undefined, status: 'loading' },
        ] as const;
      }

      return [
        { token: highestIntentsToken, status: 'loaded' },
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
  }, [
    walletAddress,
    tokens,
    chainsFilter,
    highestIntentsToken,
    walletSupportedChains,
    state,
  ]);

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
