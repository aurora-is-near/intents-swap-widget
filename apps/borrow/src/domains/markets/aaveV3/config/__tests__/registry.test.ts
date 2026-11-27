import { EVM_CHAIN_IDS } from '@aurora-is-near/intents-connect';
import { getAddress, isAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { RPC_URLS } from '@/config';

import { AAVE_BORROW_CHAINS } from '../borrowAction';
import { AAVE_V3_MARKETS } from '../registry';

describe('Aave V3 registry', () => {
  it('holds the borrow action’s chains, in its order', () => {
    expect(AAVE_V3_MARKETS.map((market) => market.chain)).toEqual([
      ...AAVE_BORROW_CHAINS,
    ]);
  });

  it.each(AAVE_V3_MARKETS)('$chain: has a read RPC', (market) => {
    expect(RPC_URLS[market.chainId]).toMatch(/^https:\/\//);
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
});
