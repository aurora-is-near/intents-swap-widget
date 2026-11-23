import { EVM_CHAIN_IDS } from '@aurora-is-near/intents-connect';
import { getAddress, isAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { AAVE_V3_MARKETS, getAaveMarket } from './registry';

describe('Aave V3 registry', () => {
  it('holds Base and Arbitrum only', () => {
    expect(AAVE_V3_MARKETS.map((market) => market.chain)).toEqual([
      'base',
      'arb',
    ]);
  });

  it.each(AAVE_V3_MARKETS)(
    '$chain: chainId matches EVM_CHAIN_IDS',
    (market) => {
      expect(market.chainId).toBe(EVM_CHAIN_IDS[market.chain]);
    },
  );

  it('uses the SDK ids 8453 for base and 42161 for arb', () => {
    expect(EVM_CHAIN_IDS.base).toBe(8453);
    expect(EVM_CHAIN_IDS.arb).toBe(42161);
    expect(getAaveMarket('proto_base_v3')?.chainId).toBe(EVM_CHAIN_IDS.base);
    expect(getAaveMarket('proto_arbitrum_v3')?.chainId).toBe(EVM_CHAIN_IDS.arb);
  });

  it.each(AAVE_V3_MARKETS)('$chain: every address is checksummed', (market) => {
    const addresses = [
      market.pool,
      market.dataProvider,
      market.oracle,
      market.native?.reserve,
      market.native?.gateway,
    ];

    addresses.forEach((address) => {
      expect(address).toBeDefined();
      expect(isAddress(address ?? '', { strict: true })).toBe(true);
      expect(address).toBe(getAddress(address ?? ''));
    });
  });

  it('returns undefined for an unknown market', () => {
    expect(getAaveMarket('proto_mainnet_v3')).toBeUndefined();
  });
});
