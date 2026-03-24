import { useEffect } from 'react';

import type { ListenerProps } from './types';
import { useTokens } from '@/hooks/useTokens';

import { fireEvent } from '@/machine';
import { useUnsafeSnapshot } from '@/machine/snap';

export const INTENT_DEPOSIT_TOKENS_MAP: Record<string, string> = {
  // cbBTC (eth)
  'nep141:eth-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near':
    'nep141:nbtc.bridge.near',
  // cbBTC (base)
  'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near':
    'nep141:nbtc.bridge.near',
  // wBTC (near)
  'nep141:2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near':
    'nep141:nbtc.bridge.near',
  // xBTC (sol)
  'nep141:sol-91914f13d3b54f8126a2824d71632d4b078d7403.omft.near':
    'nep141:nbtc.bridge.near',
  // wETH (gnosis)
  'nep141:gnosis-0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1.omft.near':
    'nep141:eth.bridge.near',
  // NEAR (bsc)
  'nep245:v2_1.omni.hot.tg:56_SZzgw3HSudhZcTwPWUTi2RJB19t': 'nep141:wrap.near',
  // BTC (near)
  'nep141:btc.omft.near': 'nep141:nbtc.bridge.near',
  // USDT0 (bera)
  'nep141:bera-0x779ded0c9e1022225f8e0630b35a9b54be713736.omft.near':
    'nep141:usdt.tether-token.near',
  // USDT0 (arbitrum)
  'nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near':
    'nep141:usdt.tether-token.near',
  // USDT0 (monad)
  'nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et':
    'nep141:usdt.tether-token.near',
};

export const useSetTokenIntentsTargetEffect = ({
  isEnabled,
}: ListenerProps) => {
  const { ctx } = useUnsafeSnapshot();

  const { tokens } = useTokens();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // 1. If source token is not set - no target token exists
    if (!ctx.sourceToken) {
      fireEvent('tokenSelect', { variant: 'target', token: undefined });

      return;
    }

    const { sourceToken } = ctx;

    // 2. If source token is BTC/ETH/NEAR select corresponding target token
    if (ctx.sourceToken.assetId in INTENT_DEPOSIT_TOKENS_MAP) {
      const tkn = tokens.find(
        (t) =>
          t.isIntent &&
          t.assetId === INTENT_DEPOSIT_TOKENS_MAP[sourceToken.assetId],
      );

      fireEvent('tokenSelect', {
        variant: 'target',
        token: tkn,
      });

      return;
    }

    // 3. For all other tokens find their representations on NEAR
    const targetTokenOnNear = tokens.find(
      (t) =>
        t.isIntent &&
        t.symbol === sourceToken.symbol &&
        t.blockchain === 'near',
    );

    if (targetTokenOnNear) {
      fireEvent('tokenSelect', { variant: 'target', token: targetTokenOnNear });

      return;
    }

    // 4. If no token on NEAR - select token with the same assetId
    const firstToken = tokens.find(
      (t) => t.isIntent && t.assetId === sourceToken.assetId,
    );

    // 5. As a last resort - select USDC on NEAR
    const secondToken = tokens.find(
      (t) => t.isIntent && t.symbol === 'USDC' && t.blockchain === 'near',
    );

    fireEvent('tokenSelect', {
      variant: 'target',
      token: firstToken ?? secondToken,
    });
  }, [tokens, ctx.sourceToken]);
};
