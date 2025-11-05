import { useMemo } from 'react';
import { useTokens } from './useTokens';

export const useAllTokens = () => {
  const { tokens: defaultTokens } = useTokens();
  const { tokens: sourceTokens } = useTokens('source');
  const { tokens: targetTokens } = useTokens('target');

  const mergedTokens = useMemo(() => {
    const tokenMap: Record<string, (typeof defaultTokens)[0]> = {};

    [
      ...defaultTokens,
      ...(sourceTokens || []),
      ...(targetTokens || []),
    ].forEach((token) => {
      // Consider a token the same if it has the same assetId and isIntent flag
      const mapKey = `${token.assetId}-${token.isIntent}`;

      tokenMap[mapKey] = token;
    });

    return Object.values(tokenMap);
  }, [defaultTokens, sourceTokens, targetTokens]);

  return { tokens: mergedTokens };
};
