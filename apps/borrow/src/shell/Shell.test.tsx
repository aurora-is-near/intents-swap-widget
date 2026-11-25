import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';
import { intentsConnectApi } from '../config';
import type { PositionsReader } from '../positions/types';
import { createAppRouter } from '../router';
import {
  createFakePositionsReader,
  EVM_WALLET,
  INTERMEDIARY,
  loanPosition,
} from '../tests/fakePositions';

const wallet = vi.hoisted(() => ({
  address: '0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21' as string | undefined,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  family: 'evm' as const,
}));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', async () =>
  (await import('../tests/appKitMock')).createAppKitMock(wallet),
);

vi.mock('../markets/aaveV3', async () =>
  (await import('../tests/aaveV3Mock')).createAaveV3Mock(),
);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('../tests/balancesMock')).createBalancesMock(importOriginal),
);

const renderApp = (positionsReader?: PositionsReader) =>
  render(
    <App
      router={createAppRouter(createMemoryHistory({ initialEntries: ['/'] }))}
      {...(positionsReader ? { positionsReader } : {})}
    />,
  );

describe('Shell positions badge', () => {
  beforeEach(() => {
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

  it('shows the number of positions on My positions', async () => {
    renderApp(
      createFakePositionsReader({
        readOwnerPositions: async (owner) => [loanPosition({ owner })],
      }),
    );

    expect(
      await screen.findByRole('tab', { name: 'My positions 2' }),
    ).toBeInTheDocument();
  });

  it('shows no badge, and looks nothing up, without a positions reader', async () => {
    renderApp();

    expect(
      await screen.findByRole('tab', { name: 'My positions' }),
    ).toBeInTheDocument();
    expect(intentsConnectApi.getIntermediary).not.toHaveBeenCalled();
  });
});
