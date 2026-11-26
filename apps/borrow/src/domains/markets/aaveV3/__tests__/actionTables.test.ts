import { AAVE_BORROW_MARKETS } from '@aurora-is-near/intents-connect-actions';
import { describe, expect, it } from 'vitest';

import { AAVE_V3_MARKETS } from '../config/registry';

/**
 * The borrow action's steps go to the Pool and gateway in its own tables
 * (`@aurora-is-near/intents-connect-actions`); the app reads the same
 * markets from `registry.ts`. They must be the same contracts.
 */
describe('the borrow action’s tables', () => {
  it('cover the same chains as the registry', () => {
    expect(Object.keys(AAVE_BORROW_MARKETS)).toEqual(
      AAVE_V3_MARKETS.map(({ chain }) => chain),
    );
  });

  it.each(AAVE_V3_MARKETS.map((market) => [market.chainLabel, market]))(
    'use the registry’s Pool and gateway on %s',
    (_label, market) => {
      const table = AAVE_BORROW_MARKETS[market.chain];

      expect(table.pool).toBe(market.pool);
      expect(table.gateway).toBe(market.native?.gateway);
      expect(table.chainLabel).toBe(market.chainLabel);
    },
  );

  it.each(AAVE_V3_MARKETS.map((market) => [market.chainLabel, market]))(
    'supply native ETH as the registry’s wrapped reserve on %s',
    (_label, market) => {
      expect(AAVE_BORROW_MARKETS[market.chain].collateral.ETH).toMatchObject({
        native: true,
        address: market.native?.reserve,
      });
    },
  );
});
