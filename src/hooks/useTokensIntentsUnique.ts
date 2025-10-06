import { useMemo } from 'react';

import { useTokens } from './useTokens';

// 1. By default we use unique check by: NEAR blockchain + SYMBOL
// 2. If token has no Near blockchain - we show it as is e.g. ZCASH etc.
// 3. Some tokens can have multiple chains but different symbols so 1. check
//    fails and we need a manual mapping for such cases
//
// Tokens: cbBTC (base), cbBTC (eth), wBTC (near), xBTC (sol), wETH (gnosis), wNEAR (near) + ETH (near), BTC (near), NEAR
const uniqueIntentTokensFilter = {
  rename: { 'nep141:wrap.near': 'NEAR' } as Record<string, string>,
  hide: [
    'nep141:eth-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near', // cbBTC (eth)
    'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near', // cbBTC (base)
    'nep141:gnosis-0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1.omft.near', // wETH (gnosis)
    'nep141:2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near', // wBTC (near)
    'nep245:v2_1.omni.hot.tg:56_SZzgw3HSudhZcTwPWUTi2RJB19t', // NEAR (bsc)
  ],
};

export const useTokensIntentsUnique = () => {
  const { tokens } = useTokens();

  return {
    uniqueIntentsTokens: useMemo(() => {
      const nearTokens = tokens.filter(
        (t) =>
          t.blockchain === 'near' &&
          !uniqueIntentTokensFilter.hide.includes(t.assetId),
      );

      const nearTokenSymbols = nearTokens.map((t) => t.symbol);
      const notNearTokens = tokens.filter((t) => {
        return (
          t.blockchain !== 'near' &&
          !nearTokenSymbols.includes(t.symbol) &&
          !uniqueIntentTokensFilter.hide.includes(t.assetId)
        );
      });

      return [
        ...nearTokens,
        ...notNearTokens.map((t) =>
          t.assetId in uniqueIntentTokensFilter.rename
            ? { ...t, symbol: uniqueIntentTokensFilter.rename[t.assetId] }
            : t,
        ),
      ];
    }, [tokens]),
  };
};
