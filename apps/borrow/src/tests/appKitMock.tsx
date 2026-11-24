import { createContext, type ReactNode } from 'react';
import { vi } from 'vitest';

type MockWallet = {
  address: string | undefined;
  isConnected: boolean;
  connect: () => unknown;
  disconnect: () => unknown;
  /** The connection's family (`evm`, `sol`); unknown when left out. */
  family?: 'evm' | 'sol' | null;
};

/**
 * A stand-in for `@aurora-is-near/intents-connect-wallet/connect/appkit`: an
 * empty `AppKitContext`, a pass-through `AppKitProvider`, and
 * `useIntentsConnectWallet` returning `wallet`, disconnected by default.
 * Pass a `vi.hoisted` object to change the wallet state from a test.
 *
 * `vi.mock` is hoisted per file, so each test file keeps its own call:
 * `vi.mock(path, async () => (await import('./tests/appKitMock')).createAppKitMock())`.
 */
export const createAppKitMock = (
  wallet: MockWallet = {
    address: undefined,
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
) => ({
  AppKitContext: createContext(undefined),
  AppKitProvider: ({ children }: { children: ReactNode }) => children,
  useIntentsConnectWallet: () => wallet,
});
