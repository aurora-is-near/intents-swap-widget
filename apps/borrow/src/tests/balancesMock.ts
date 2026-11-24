import type {
  UseSupportedTokensResult,
  UseWalletBalancesResult,
} from '@aurora-is-near/intents-connect/react';
import { vi } from 'vitest';

export type BalancesMockState = {
  wallet: UseWalletBalancesResult;
  supported: UseSupportedTokensResult;
};

/** No wallet read: what the SDK hooks give while disconnected. */
export const emptyBalances = (): BalancesMockState => ({
  wallet: {
    balances: {},
    errors: {},
    tokens: [],
    status: 'idle',
    refresh: vi.fn(() => Promise.resolve()),
  },
  supported: {
    origins: [],
    destinations: [],
    status: 'idle',
    refresh: vi.fn(() => Promise.resolve()),
  },
});

/**
 * A stand-in for `@aurora-is-near/intents-connect/react` that keeps the real
 * provider and replaces the two hooks the funding assets read
 * (`useWalletBalances`, `useSupportedTokens`) with `state`, so no test reads
 * a chain or the token list over the network. Pass a `vi.hoisted` object to
 * change the balances from a test.
 *
 * `vi.mock` is hoisted per file, so each test file keeps its own call:
 * `vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
 * (await import('./tests/balancesMock')).createBalancesMock(importOriginal))`.
 */
export const createBalancesMock = async (
  importOriginal: () => Promise<object>,
  state: BalancesMockState = emptyBalances(),
) => ({
  ...(await importOriginal()),
  useWalletBalances: () => state.wallet,
  useSupportedTokens: () => state.supported,
});
