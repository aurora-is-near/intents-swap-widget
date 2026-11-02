import type { Token } from '@/types/token';

import { getIntentsTargetToken } from './getIntentsTargetToken';

const token = (
  assetId: string,
  symbol: string,
  blockchain: Token['blockchain'],
  isIntent: boolean,
): Token => ({
  assetId,
  symbol,
  blockchain,
  isIntent,
  decimals: 6,
  price: 1,
  icon: '',
  chainName: blockchain,
  name: symbol,
});

const USDC_NEAR =
  'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';

const USDC_BASE =
  'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';

const CBBTC_BASE =
  'nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near';

const ZEC = 'nep141:zec.omft.near';

const TOKENS = [
  token(USDC_BASE, 'USDC', 'base', false),
  token(USDC_BASE, 'USDC', 'base', true),
  token(USDC_NEAR, 'USDC', 'near', true),
  token(CBBTC_BASE, 'cbBTC', 'base', true),
  token('nep141:nbtc.bridge.near', 'BTC', 'near', true),
  token(ZEC, 'ZEC', 'zec', true),
];

describe('getIntentsTargetToken', () => {
  it('maps a token to its NEAR representation by symbol', () => {
    expect(
      getIntentsTargetToken({ assetId: USDC_BASE, symbol: 'USDC' }, TOKENS)
        ?.assetId,
    ).toBe(USDC_NEAR);
  });

  it('uses the explicit map first', () => {
    expect(
      getIntentsTargetToken({ assetId: CBBTC_BASE, symbol: 'cbBTC' }, TOKENS)
        ?.assetId,
    ).toBe('nep141:nbtc.bridge.near');
  });

  it('keeps a token that exists only off NEAR', () => {
    const target = getIntentsTargetToken(
      { assetId: ZEC, symbol: 'ZEC' },
      TOKENS,
    );

    expect(target?.assetId).toBe(ZEC);
    expect(target?.isIntent).toBe(true);
  });

  it('falls back to USDC on NEAR', () => {
    expect(
      getIntentsTargetToken({ assetId: 'nep141:unknown', symbol: 'X' }, TOKENS)
        ?.assetId,
    ).toBe(USDC_NEAR);
  });

  it('only returns intents tokens', () => {
    expect(
      getIntentsTargetToken({ assetId: USDC_BASE, symbol: 'USDC' }, [
        token(USDC_BASE, 'USDC', 'base', false),
      ]),
    ).toBeUndefined();
  });
});
