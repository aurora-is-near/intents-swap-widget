import { describe, expect, it } from 'vitest';

import { nativeEth, weth } from '@/tests/fakeMarkets';

import { AAVE_BORROW_INTENT, collateralDestination } from '../recipe';

/**
 * The recipe itself is the adapter's (`LendingMarketAdapter.borrowRecipe`):
 * the Aave adapter's is tested in `markets/aaveV3/borrowRecipe.test.ts`, and
 * the steps the hosted `aave-v3-borrow` action resolves are pinned by
 * `markets/aaveV3/__tests__/borrowAction.contract.test.ts`.
 */

describe('AAVE_BORROW_INTENT', () => {
  it('files every borrow as aave_borrow, which restore looks for', () => {
    expect(AAVE_BORROW_INTENT).toBe('aave_borrow');
  });
});

describe('collateralDestination', () => {
  it('delivers the ERC-20 collateral to the market chain', () => {
    expect(collateralDestination({ chain: 'base' }, weth())).toEqual({
      chain: 'base',
      assetId: 'nep141:weth',
      tokenAddress: '0x0000000000000000000000000000000000000001',
    });
  });

  it('delivers natively delivered collateral as the gas token, with no contract', () => {
    expect(collateralDestination({ chain: 'base' }, nativeEth())).toEqual({
      chain: 'base',
      assetId: 'nep141:eth',
      tokenAddress: undefined,
    });
  });
});
