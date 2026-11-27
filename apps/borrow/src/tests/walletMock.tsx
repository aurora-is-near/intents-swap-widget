import { vi } from 'vitest';
import type { ReactNode } from 'react';

import type { WalletFamily, WalletSession } from '@/domains/wallet/types';

type MockWallet = {
  address: string | undefined;
  isConnected: boolean;
  connect: () => unknown;
  disconnect: () => unknown;
  /** The connection's family; unknown when left out. */
  family?: WalletFamily | null;
};

/**
 * A stand-in for `@/domains/wallet/hooks/useWallet`: `useWallet` returns
 * `wallet` as it is when called (with no Intents Connect wallet),
 * disconnected by default. Pass a `vi.hoisted` object to change the wallet
 * state from a test.
 *
 * `vi.mock` is hoisted per file, so each test file keeps its own call:
 * `vi.mock('@/domains/wallet/hooks/useWallet', async () => (await import('@/tests/walletMock')).createWalletMock(wallet))`.
 */
export const createWalletMock = (
  wallet: MockWallet = {
    address: undefined,
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
) => ({
  useWallet: () =>
    ({ family: null, wallet: null, ...wallet }) as unknown as WalletSession,
});

/**
 * A pass-through `WalletProvider`, for tests that render the whole app:
 * no AppKit, no NEAR or Stellar connectors. Pair it with `createWalletMock`.
 */
export const createWalletProviderMock = () => ({
  WalletProvider: ({ children }: { children: ReactNode }) => children,
});
