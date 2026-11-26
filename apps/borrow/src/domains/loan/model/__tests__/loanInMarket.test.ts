import { describe, expect, it } from 'vitest';

import { baseToUsd } from '@/domains/markets/utils/format';
import { FAKE_BASE, pairSnapshot, USD } from '@/tests/fakeMarkets';

import { loanInMarket, loanSizeUsd } from '../loanInMarket';

const ETH = 10n ** 18n;

/** 1 WETH (not held) at $3,000 against USDC, LTV 50%, in Base's market. */
const input = {
  snapshot: pairSnapshot(FAKE_BASE),
  funding: { asset: undefined, symbol: 'WETH', decimals: 18 },
  pair: { collateral: 'WETH', borrow: 'USDC' },
  atomic: ETH,
  ltv: 50,
};

describe('loanSizeUsd', () => {
  it('is the collateral’s value × the LTV, at the market’s oracle', () => {
    expect(loanSizeUsd(input)).toBe(1500);
  });

  it('is undefined with no amount, or no price for it', () => {
    expect(loanSizeUsd({ ...input, atomic: 0n })).toBeUndefined();
    expect(loanSizeUsd({ ...input, snapshot: undefined })).toBeUndefined();
  });
});

describe('loanInMarket', () => {
  it('reads the collateral, the borrow reserve and the figures in the market', () => {
    const loan = loanInMarket(input);

    expect(loan.choice?.reserve.symbol).toBe('WETH');
    expect(loan.converted).toBe(false);
    expect(loan.amountUsd).toBe(3000);
    expect(loan.borrowReserve?.symbol).toBe('USDC');
    // 0.997 WETH (less the 0.30% fee) at $3,000, LTV 50%.
    expect(loan.figures?.borrowAmount).toBe(1_495_500_000n);
  });

  it('gives the liquidation price in dollars at the market’s oracle unit', () => {
    const { figures, liquidationPriceUsd } = loanInMarket(input);

    expect(figures?.liquidationPrice).not.toBeNull();
    expect(liquidationPriceUsd).toBe(
      baseToUsd(figures?.liquidationPrice ?? 0n, USD),
    );
  });

  it('has no figures until a market has the pair', () => {
    expect(loanInMarket({ ...input, snapshot: undefined })).toMatchObject({
      choice: undefined,
      borrowReserve: undefined,
      figures: undefined,
      liquidationPriceUsd: undefined,
    });

    const noBorrow = loanInMarket({
      ...input,
      pair: { collateral: 'WETH', borrow: 'DAI' },
    });

    expect(noBorrow.choice?.reserve.symbol).toBe('WETH');
    expect(noBorrow.borrowReserve).toBeUndefined();
    expect(noBorrow.figures).toBeUndefined();
    expect(noBorrow.liquidationPriceUsd).toBeUndefined();
  });
});
