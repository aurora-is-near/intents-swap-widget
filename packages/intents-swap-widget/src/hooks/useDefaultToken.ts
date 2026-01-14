import { useEffect } from 'react';
import { useTokens } from './useTokens';
import { DefaultToken, Token } from '../types';
import { useConfig } from '../config';
import { logger } from '../logger';

export const useDefaultToken = (
  variant: 'source' | 'target',
  onMsg: (msg: { type: 'on_select_token'; token: Token }) => void,
) => {
  const { tokens } = useTokens(variant);
  const { defaultSourceToken, defaultTargetToken } = useConfig();

  // The set is needed here as, at the time of writing, the tokens list will
  // include two variants of each asset, with isIntent set as true or false.
  const uniqueAssetIds = Array.from(
    new Set(tokens.map((token) => token.assetId)),
  );

  const setDefaultToken = (defaultToken: DefaultToken) => {
    const foundToken = tokens.find(
      (token) =>
        token.symbol.toUpperCase() === defaultToken.symbol.toUpperCase() &&
        token.chainName === defaultToken.chainName,
    );

    if (!foundToken) {
      logger.error(
        `Default ${variant} token not found: ${defaultToken.symbol} on ${defaultToken.chainName}`,
      );

      return;
    }

    if (foundToken) {
      onMsg({ type: 'on_select_token', token: foundToken });
    }
  };

  useEffect(() => {
    const singleToken = uniqueAssetIds.length === 1 ? tokens[0] : null;

    // If there is only one token for a given variant, select it by default
    if (singleToken) {
      onMsg({ type: 'on_select_token', token: singleToken });
    }

    if (variant === 'source' && defaultSourceToken) {
      setDefaultToken(defaultSourceToken);
    }

    if (variant === 'target' && defaultTargetToken) {
      setDefaultToken(defaultTargetToken);
    }
  }, [tokens, defaultSourceToken, defaultTargetToken]);
};
