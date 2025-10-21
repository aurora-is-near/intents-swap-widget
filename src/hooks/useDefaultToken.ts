import { useEffect } from 'react';
import { useTokens } from './useTokens';
import { Token } from '../types';

export const useDefaultToken = (
  variant: 'source' | 'target',
  onMsg: (msg: { type: 'on_select_token'; token: Token }) => void,
) => {
  const { tokens } = useTokens(variant);

  // The set is needed here as, at the time of writing, the tokens list will
  // include two variants of each asset, with isIntent set as true or false.
  const uniqueAssetIds = Array.from(
    new Set(tokens.map((token) => token.assetId)),
  );

  // If there is only one token for a given variant, select it by default
  useEffect(() => {
    const singleToken = uniqueAssetIds.length === 1 ? tokens[0] : null;

    if (singleToken) {
      onMsg({ type: 'on_select_token', token: singleToken });
    }
  }, [tokens]);
};
