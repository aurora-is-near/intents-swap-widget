import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { intentsConnectApi } from '../config';
import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import { createTestQueryClient } from '../tests/fakeMarkets';
import {
  createFakePositionsReader,
  EVM_WALLET,
  type FakePositionsReader,
  INTERMEDIARY,
  loanPosition,
} from '../tests/fakePositions';
import { PositionsReaderProvider } from './PositionsReaderProvider';
import { usePositionsCount } from './usePositionsCount';

const wallet = vi.hoisted(() => ({
  address: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21' as string | undefined,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  wallet: {},
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', () => ({
  useIntentsConnectWallet: () => wallet,
}));

const INTERMEDIARY_LOAN = loanPosition();
const WALLET_LOAN = loanPosition({ owner: EVM_WALLET });

const bothLoans = async (owner: string) =>
  owner === INTERMEDIARY ? [INTERMEDIARY_LOAN] : [WALLET_LOAN];

const render = (reader: FakePositionsReader) => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MarketAdaptersProvider adapters={[]}>
        <PositionsReaderProvider reader={reader}>
          {children}
        </PositionsReaderProvider>
      </MarketAdaptersProvider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...renderHook(() => usePositionsCount(), { wrapper }),
  };
};

const readAgain = (queryClient: ReturnType<typeof render>['queryClient']) =>
  act(() => queryClient.invalidateQueries({ queryKey: ['positions'] }));

describe('usePositionsCount', () => {
  beforeEach(() => {
    wallet.address = EVM_WALLET;
    vi.spyOn(intentsConnectApi, 'getIntermediary').mockResolvedValue({
      originAccount: EVM_WALLET,
      originType: 'evm',
      evm: INTERMEDIARY,
      solana: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts every listed position', async () => {
    const { result } = render(
      createFakePositionsReader({ readOwnerPositions: bothLoans }),
    );

    await waitFor(() => expect(result.current).toBe(2));
  });

  it('keeps the last known count while a read fails, never dropping to 0', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: bothLoans,
    });

    const { result, queryClient } = render(reader);

    await waitFor(() => expect(result.current).toBe(2));

    // The intermediary now reads no loans, and the wallet's read fails.
    reader.readOwnerPositions.mockImplementation(async (owner) => {
      if (owner === EVM_WALLET) {
        throw new Error('down');
      }

      return [];
    });
    await readAgain(queryClient);

    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(4),
    );

    expect(result.current).toBe(2);

    // Every read fails: still the last known count.
    reader.readOwnerPositions.mockRejectedValue(new Error('down'));
    await readAgain(queryClient);

    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(6),
    );

    expect(result.current).toBe(2);

    // Read again without errors: the new count.
    reader.readOwnerPositions.mockImplementation(async (owner) =>
      owner === INTERMEDIARY ? [] : [WALLET_LOAN],
    );
    await readAgain(queryClient);

    await waitFor(() => expect(result.current).toBe(1));
  });

  it('follows the owner reads while a market-data read fails', async () => {
    // A loan whose risk figures come from its market's data.
    const BARE_LOAN = loanPosition({ liquidationLtv: null, borrowApr: null });
    const reader = createFakePositionsReader({
      readOwnerPositions: async (owner) =>
        owner === INTERMEDIARY ? [BARE_LOAN] : [],
    });

    const { result, queryClient } = render(reader);

    await waitFor(() => expect(reader.readMarketRisk).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBe(1));

    // The market data stops answering.
    reader.readMarketRisk.mockRejectedValue(new Error('market data down'));
    await act(() =>
      queryClient.refetchQueries({ queryKey: ['position-market-risk'] }),
    );

    // A second loan opens; the market data is still down.
    reader.readOwnerPositions.mockImplementation(async (owner) =>
      owner === INTERMEDIARY
        ? [BARE_LOAN, loanPosition({ marketId: 'aave-v3-base-2' })]
        : [],
    );
    await readAgain(queryClient);

    await waitFor(() => expect(result.current).toBe(2));
  });

  it('is 0 when nothing could ever be read', async () => {
    const reader = createFakePositionsReader({
      readOwnerPositions: async () => {
        throw new Error('down');
      },
    });

    const { result } = render(reader);

    await waitFor(() =>
      expect(reader.readOwnerPositions).toHaveBeenCalledTimes(2),
    );

    expect(result.current).toBe(0);
  });
});
