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
import type { Token } from '@/types/token';

import type { ListenerProps } from './types';

export type Props = ListenerProps & {
  skipIntents?: boolean;
  target?: 'none' | 'same-asset';
};

export const useSelectedTokensEffect = ({
  isEnabled,
  skipIntents = false,
  target = 'none',
}: Props) => {
  const { tokens } = useTokens();
  const { ctx, state } = useUnsafeSnapshot();
  const { intentBalances } = useIntentsBalance();
  const {
    walletSupportedChains,
    chainsFilter,
    walletAddress,
    intentsAccountType,
  } = useConfig();

  const highestIntentsToken = getTokenWithHighBalance({
    tokens,
    walletSupportedChains,
    balances: intentBalances,
    across: 'intents',
  });

  const [sourceToken, targetToken] = useMemo(() => {
    if (!walletAddress && !skipIntents) {
      const defaultIntentsToken = getDefaultIntentsToken({ tokens });

      return [
        { token: defaultIntentsToken, status: 'loaded' },
        { token: undefined, status: 'loaded' },
      ] as const;
    }

    if (chainsFilter.source.intents !== 'none' && !skipIntents) {
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
    tokens,
    skipIntents,
    chainsFilter,
    walletAddress,
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

      if (
        targetToken.status === 'loaded' &&
        sourceToken.status === 'loaded' &&
        !ctx.targetToken
      ) {
        let tkn: Token | undefined = targetToken.token;

        if (target === 'same-asset') {
          if (sourceToken.token?.isIntent) {
            tkn = tokens.find(
              (t) =>
                !t.isIntent &&
                t.symbol === ctx.sourceToken?.symbol &&
                (intentsAccountType === 'near'
                  ? t.blockchain === 'near'
                  : t.blockchain === 'eth'),
            );
          } else {
            tkn = tokens.find(
              (t) => t.isIntent && t.symbol === ctx.sourceToken?.symbol,
            );
          }
        }

        fireEvent('tokenSelect', {
          variant: 'target',
          token: tkn,
        });
      }
    }
  }, [ctx, sourceToken, targetToken, isEnabled]);

  return { source: ctx.sourceToken, target: ctx.targetToken };
};
