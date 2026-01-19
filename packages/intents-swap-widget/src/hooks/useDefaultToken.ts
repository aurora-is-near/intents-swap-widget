import { useEffect } from 'react';
import { useTokens } from './useTokens';
import { DefaultToken, Token } from '../types';
import { useConfig } from '../config';
import { logger } from '../logger';
import { fireEvent, useUnsafeSnapshot } from '../machine';
import { notReachable } from '../utils';

const isSameToken = (
  tokenA?: { symbol: string; blockchain: string } | null,
  tokenB?: { symbol: string; blockchain: string } | null,
) => {
  if (!tokenA || !tokenB) {
    return tokenA === tokenB;
  }

  return (
    tokenA.symbol === tokenB.symbol && tokenA.blockchain === tokenB.blockchain
  );
};

export const useDefaultToken = (
  variant: 'source' | 'target',
  onMsg: (msg: { type: 'on_select_token'; token: Token }) => void,
) => {
  const { tokens } = useTokens(variant);
  const { defaultSourceToken, defaultTargetToken } = useConfig();
  const { ctx } = useUnsafeSnapshot();

  // The set is needed here as, at the time of writing, the tokens list will
  // include two variants of each asset, with isIntent set as true or false.
  const uniqueAssetIds = Array.from(
    new Set(tokens.map((token) => token.assetId)),
  );

  const setDefaultToken = (
    defaultToken?: DefaultToken | null,
    currentDefaultToken?: DefaultToken | null,
  ) => {
    if (isSameToken(defaultToken, currentDefaultToken)) {
      // Only set the default token once, then allow the user to change it
      return;
    }

    // Store the default globally to help avoid resetting it on every render
    fireEvent('tokenSetDefault', {
      variant,
      token: defaultToken,
    });

    if (!defaultToken) {
      return;
    }

    const foundToken = tokens.find(
      (token) =>
        token.symbol.toUpperCase() === defaultToken.symbol.toUpperCase() &&
        token.blockchain === defaultToken.blockchain,
    );

    if (!foundToken) {
      logger.error(
        `Default ${variant} token not found: ${defaultToken.symbol} on ${defaultToken.blockchain}. ` +
          `Available ${defaultToken.blockchain} tokens: ${tokens
            .filter((token) => token.blockchain === defaultToken.blockchain)
            .map((token) => token.symbol)
            .join(', ')}`,
      );

      return;
    }

    if (foundToken) {
      onMsg({ type: 'on_select_token', token: foundToken });
    }
  };

  useEffect(() => {
    const singleToken = uniqueAssetIds.length === 1 ? tokens[0] : null;

    // If there is only one token for a given variant it is always selected
    if (singleToken) {
      onMsg({ type: 'on_select_token', token: singleToken });

      return;
    }

    switch (variant) {
      case 'source':
        setDefaultToken(defaultSourceToken, ctx.sourceTokenDefault);
        break;
      case 'target':
        setDefaultToken(defaultTargetToken, ctx.targetTokenDefault);
        break;
      default:
        notReachable(variant, { throwError: false });
    }
  }, [tokens, defaultSourceToken, defaultTargetToken]);
};
