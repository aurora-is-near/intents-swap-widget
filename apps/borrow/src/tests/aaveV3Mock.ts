import { createFakeAdapter } from './fakeMarkets';

/**
 * A stand-in for `./markets/aaveV3` that keeps App-level tests off the
 * network: `createAaveV3Adapter` returns the shared fake adapter, which lists
 * Base and Arbitrum with fixed WETH / USDC snapshots (`FAKE_SNAPSHOTS`), so
 * the New loan tab shows real cards without any request.
 *
 * `vi.mock` is hoisted per file, so each test file keeps its own call:
 * `vi.mock('./markets/aaveV3', async () => (await import('./tests/aaveV3Mock')).createAaveV3Mock())`.
 */
export const createAaveV3Mock = () => ({
  AAVE_V3_ADAPTER_ID: 'aave-v3',
  createAaveV3Adapter: () => createFakeAdapter({ id: 'aave-v3' }),
});
