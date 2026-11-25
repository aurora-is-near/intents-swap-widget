import type { Intermediary } from '@aurora-is-near/intents-connect';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { intentsConnectApi } from '../config';
import { EVM_WALLET, INTERMEDIARY } from '../tests/fakePositions';
import { createTestQueryClient } from '../tests/fakeMarkets';
import { readDebugPositionsOwner, useOwnerAccounts } from './useOwnerAccounts';

const SOLANA_WALLET = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const DEBUG_OWNER = '0x195954FBa43C1A4266F5A66B4Fe468f459Fd0611';

const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  wallet: null as { getPublicKey?: () => string } | null,
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', () => ({
  useIntentsConnectWallet: () => wallet,
}));

const intermediaryOf = (evm: string): Intermediary => ({
  originAccount: wallet.address ?? '',
  originType: 'evm',
  evm,
  solana: null,
});

const connectEvm = () => {
  wallet.address = EVM_WALLET;
  wallet.isConnected = true;
  wallet.wallet = {};
};

const connectSolana = () => {
  wallet.address = SOLANA_WALLET;
  wallet.isConnected = true;
  wallet.wallet = { getPublicKey: () => `ed25519:${SOLANA_WALLET}` };
};

const render = (options?: Parameters<typeof useOwnerAccounts>[0]) => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    queryClient,
    ...renderHook(() => useOwnerAccounts(options), { wrapper }),
  };
};

describe('useOwnerAccounts', () => {
  beforeEach(() => {
    wallet.address = undefined;
    wallet.isConnected = false;
    wallet.wallet = null;
    vi.spyOn(intentsConnectApi, 'getIntermediary').mockResolvedValue(
      intermediaryOf(INTERMEDIARY.toUpperCase().replace('0X', '0x')),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('lists the intermediary, then the EVM wallet, both lowercase', async () => {
    connectEvm();

    const { result, queryClient } = render();

    expect(result.current.isLoading).toBe(true);
    // The wallet is read while the intermediary is looked up.
    expect(result.current.owners).toEqual([EVM_WALLET]);

    await waitFor(() =>
      expect(result.current.owners).toEqual([INTERMEDIARY, EVM_WALLET]),
    );

    expect(result.current.intermediary).toBe(INTERMEDIARY);
    expect(result.current.isLoading).toBe(false);
    expect(intentsConnectApi.getIntermediary).toHaveBeenCalledWith(EVM_WALLET, {
      publicKey: undefined,
    });
    // Read once per wallet: the intermediary never changes.
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ['intermediary', EVM_WALLET, null] })?.options,
    ).toMatchObject({ staleTime: Infinity });
  });

  it('lists only the intermediary for a non-EVM wallet, looked up with its public key', async () => {
    connectSolana();

    const { result } = render();

    await waitFor(() => expect(result.current.owners).toEqual([INTERMEDIARY]));

    expect(intentsConnectApi.getIntermediary).toHaveBeenCalledWith(
      SOLANA_WALLET,
      { publicKey: `ed25519:${SOLANA_WALLET}` },
    );
  });

  it('keeps the EVM wallet and reports the error when the lookup fails', async () => {
    connectEvm();
    vi.mocked(intentsConnectApi.getIntermediary).mockRejectedValue(
      new Error('lookup failed'),
    );

    const { result } = render();

    await waitFor(() =>
      expect(result.current.error?.message).toBe('lookup failed'),
    );

    expect(result.current.owners).toEqual([EVM_WALLET]);
    expect(result.current.intermediary).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('lists nothing while disconnected', () => {
    const { result } = render();

    expect(result.current.owners).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(intentsConnectApi.getIntermediary).not.toHaveBeenCalled();
  });

  it('reads nothing when disabled', () => {
    connectEvm();

    const { result } = render({ enabled: false });

    expect(result.current.owners).toEqual([]);
    expect(intentsConnectApi.getIntermediary).not.toHaveBeenCalled();
  });

  it('reads the dev override instead of the wallet, connected or not', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEBUG_POSITIONS_OWNER', DEBUG_OWNER);

    const { result } = render();

    expect(result.current.owners).toEqual([DEBUG_OWNER.toLowerCase()]);
    expect(result.current.intermediary).toBe(DEBUG_OWNER.toLowerCase());
    expect(intentsConnectApi.getIntermediary).not.toHaveBeenCalled();
  });

  it('ignores the dev override outside development', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_DEBUG_POSITIONS_OWNER', DEBUG_OWNER);
    connectEvm();

    const { result } = render();

    await waitFor(() =>
      expect(result.current.owners).toEqual([INTERMEDIARY, EVM_WALLET]),
    );
  });
});

describe('readDebugPositionsOwner', () => {
  it('is the override in development, lowercase', () => {
    expect(
      readDebugPositionsOwner({
        DEV: true,
        VITE_DEBUG_POSITIONS_OWNER: ` ${DEBUG_OWNER} `,
      }),
    ).toBe(DEBUG_OWNER.toLowerCase());
  });

  it('is ignored outside development', () => {
    expect(
      readDebugPositionsOwner({
        DEV: false,
        VITE_DEBUG_POSITIONS_OWNER: DEBUG_OWNER,
      }),
    ).toBeUndefined();
  });

  it('is ignored when unset or not an EVM address', () => {
    expect(readDebugPositionsOwner({ DEV: true })).toBeUndefined();
    expect(
      readDebugPositionsOwner({ DEV: true, VITE_DEBUG_POSITIONS_OWNER: '' }),
    ).toBeUndefined();
    expect(
      readDebugPositionsOwner({
        DEV: true,
        VITE_DEBUG_POSITIONS_OWNER: SOLANA_WALLET,
      }),
    ).toBeUndefined();
  });
});
