import { describe, expect, it } from 'vitest';

import { FAKE_BASE, pairSnapshot, usdc } from '../../tests/fakeMarkets';
import { checkLiquidity } from './liquidity';

const USDC = 10n ** 6n;

const withLiquidity = (availableLiquidity: bigint, unavailable?: boolean) =>
  pairSnapshot(FAKE_BASE, {
    borrowable: [usdc({ availableLiquidity, unavailable })],
  });

describe('checkLiquidity', () => {
  it('passes when the refetched reserve can lend the borrow amount', () => {
    expect(
      checkLiquidity(withLiquidity(1_500n * USDC), usdc(), 1_500n * USDC),
    ).toBe('ok');
  });

  it('reports no liquidity when the refetched reserve has less than the borrow amount', () => {
    expect(
      checkLiquidity(withLiquidity(1_499n * USDC), usdc(), 1_500n * USDC),
    ).toBe('noLiquidity');
  });

  it('reports no liquidity when the reserve is gone from the snapshot', () => {
    expect(
      checkLiquidity(
        withLiquidity(2_000n * USDC),
        { asset: '0x00000000000000000000000000000000000000AB' },
        USDC,
      ),
    ).toBe('noLiquidity');
  });

  it('matches the reserve by address in any case', () => {
    expect(
      checkLiquidity(
        pairSnapshot(FAKE_BASE, {
          borrowable: [
            usdc({ asset: '0x00000000000000000000000000000000000000ab' }),
          ],
        }),
        { asset: '0x00000000000000000000000000000000000000AB' },
        USDC,
      ),
    ).toBe('ok');
  });

  it('reports no liquidity when the reserve is no longer borrowable', () => {
    expect(
      checkLiquidity(withLiquidity(2_000n * USDC, true), usdc(), USDC),
    ).toBe('noLiquidity');
  });
});
