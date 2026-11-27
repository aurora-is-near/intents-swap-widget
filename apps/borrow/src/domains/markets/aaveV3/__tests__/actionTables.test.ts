import { describe, expect, it } from 'vitest';

import { AAVE_BORROW_MARKETS } from '../config/borrowAction';
import { AAVE_V3_MARKETS } from '../config/registry';
import type { AaveCollateralAsset } from '../config/borrowAction';

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
    'supply the native token as the registry’s wrapped reserve on %s',
    (_label, market) => {
      const symbol = market.native?.symbol as AaveCollateralAsset;

      expect(AAVE_BORROW_MARKETS[market.chain].collateral[symbol]).toEqual({
        label: symbol,
        address: market.native?.reserve,
        native: true,
      });
    },
  );

  it.each(AAVE_V3_MARKETS.map((market) => [market.chainLabel, market]))(
    'take only the native token natively on %s',
    (_label, market) => {
      const nativeCollateral = Object.entries(
        AAVE_BORROW_MARKETS[market.chain].collateral,
      )
        .filter(([, token]) => token.native)
        .map(([symbol]) => symbol);

      expect(nativeCollateral).toEqual([market.native?.symbol]);
    },
  );
});
