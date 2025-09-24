import { useEffect, useMemo } from 'react';

import { useConfig } from '@/config';
import { useTokens } from '@/hooks/useTokens';
import { useIntentsBalance } from '@/hooks/useIntentsBalance';
import { getMainTokenByChain } from '@/utils/tokens/getMainTokenByChain';
import { getDefaultIntentsToken } from '@/utils/tokens/getDefaultIntentsToken';
import { getTokenWithHighBalance } from '@/utils/tokens/getTokenWithHighBalance';
import { CHAIN_BASE_TOKENS } from '@/constants/chains';
import type { WipgetConfig } from '@/config';
import type { Chains } from '@/types/chain';

import { fireEvent } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { Token } from '@/types/token';

import type { ListenerProps } from './types';

export type Props = ListenerProps & {
  skipIntents?: boolean;
  target?: 'none' | 'same-asset';
};

const accountChainMap: Record<WipgetConfig['intentsAccountType'], Chains> = {
  sol: 'sol',
  evm: 'eth',
  near: 'near',
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
                t.blockchain === accountChainMap[intentsAccountType],
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

  // in case we cannot load intents balances we eventually set default token
  // based on wallet supported chains to avoid infinite loading state
  useEffect(() => {
    const isGuardedState = guardStates(ctx, ['initial_dry', 'initial_wallet']);

    if (!isEnabled || !isGuardedState) {
      return;
    }

    const timer = setTimeout(() => {
      if (!sourceToken.token) {
        // 1. Intents token if possible
        if (!skipIntents) {
          fireEvent('tokenSelect', {
            variant: 'source',
            token: getDefaultIntentsToken({ tokens }),
          });
          // 2. Wallet base token if intents not supported
        } else if (walletSupportedChains.length) {
          fireEvent('tokenSelect', {
            variant: 'source',
            token: tokens.find(
              (t) =>
                !t.isIntent &&
                t.blockchain === accountChainMap[intentsAccountType] &&
                t.symbol ===
                  CHAIN_BASE_TOKENS[
                    accountChainMap[intentsAccountType]
                  ]?.toLowerCase(),
            ),
          });
          // 3. Fallback to ETH if intents is not supported and wallet is not connected
        } else {
          fireEvent('tokenSelect', {
            variant: 'source',
            token: tokens.find(
              (t) =>
                !t.isIntent && t.blockchain === 'eth' && t.symbol === 'ETH',
            ),
          });
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return { source: ctx.sourceToken, target: ctx.targetToken };
};
