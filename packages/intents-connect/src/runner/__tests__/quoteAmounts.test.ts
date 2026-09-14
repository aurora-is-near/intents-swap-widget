import { describe, expect, it } from 'vitest';
import type { Execution } from '@/types/execution';
import { getQuoteSpendable } from '@/runner/quoteAmounts';

const quote = (type: Execution['type'], minimum: string, fee?: string) =>
  ({
    type,
    quote: { minAmountOut: minimum },
    details: { networkFee: fee },
  }) as Execution;

describe('getQuoteSpendable', () => {
  it('deducts the separately reported fee in the live Solana fixture', () => {
    expect(getQuoteSpendable(quote('solana', '4685923', '213113'))).toBe(
      '4472810',
    );
  });

  it('does not subtract an EVM fee twice', () => {
    expect(getQuoteSpendable(quote('evm', '4472810', '213113'))).toBe(
      '4472810',
    );
  });

  it.each(['100', '101'])(
    'rejects a Solana fee of %s against a guarantee of 100',
    (fee) => {
      expect(() => getQuoteSpendable(quote('solana', '100', fee))).toThrow(
        /network fee/,
      );
    },
  );

  it('rejects a missing fee and preserves atomic precision', () => {
    expect(() => getQuoteSpendable(quote('solana', '100'))).toThrow(
      /networkFee/,
    );
    expect(getQuoteSpendable(quote('solana', '1000000000000000001', '2'))).toBe(
      '999999999999999999',
    );
  });
});
