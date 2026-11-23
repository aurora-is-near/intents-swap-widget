import type { LendingMarketAdapter } from '../markets/types';

/**
 * A stand-in for `./markets/aaveV3` that keeps App-level tests off the
 * network: `createAaveV3Adapter` returns an adapter that lists no markets, so
 * the market list settles on its empty message without any request.
 *
 * `vi.mock` is hoisted per file, so each test file keeps its own call:
 * `vi.mock('./markets/aaveV3', async () => (await import('./tests/aaveV3Mock')).createAaveV3Mock())`.
 */
export const createAaveV3Mock = () => ({
  AAVE_V3_ADAPTER_ID: 'aave-v3',
  createAaveV3Adapter: (): LendingMarketAdapter => ({
    id: 'aave-v3',
    name: 'Aave',
    listMarkets: () => Promise.resolve([]),
    getMarketSnapshot: () =>
      Promise.reject(new Error('The test adapter lists no markets')),
  }),
});
