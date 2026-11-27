import { describe, expect, it } from 'vitest';

import { AAVE_BORROW_MARKETS } from '../config/borrowAction';
import { AAVE_V3_MARKETS } from '../config/registry';

/**
 * Coverage matches the reserves Borrow reads from `registry.ts` against the
 * action's token tables (`config/borrowAction.ts`), so the two must describe
 * the same chains and the same wrapped-native reserve. The tables themselves
 * are checked against the served script, and its Pool and gateway against
 * the registry, by the live contract test.
 */
describe('the borrow action’s tables', () => {
  it('cover the same chains as the registry', () => {
    expect(Object.keys(AAVE_BORROW_MARKETS)).toEqual(
      AAVE_V3_MARKETS.map(({ chain }) => chain),
    );
  });

  it.each(AAVE_V3_MARKETS.map((market) => [market.chainLabel, market]))(
    'supply native ETH as the registry’s wrapped reserve on %s',
    (_label, market) => {
      expect(AAVE_BORROW_MARKETS[market.chain].collateral.ETH).toEqual({
        label: 'ETH',
        address: market.native?.reserve,
        native: true,
      });
    },
  );
});
