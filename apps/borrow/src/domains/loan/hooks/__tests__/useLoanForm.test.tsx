import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { MarketAdaptersProvider } from '@/domains/markets/providers/MarketAdaptersProvider';
import { emptyBalances } from '@/tests/balancesMock';
import {
  createFakeAdapter,
  createTestQueryClient,
  FAKE_ARB,
  FAKE_BASE,
  FAKE_SNAPSHOTS,
  pairSnapshot,
  readFakeSnapshot,
  usdc,
} from '@/tests/fakeMarkets';
import type { BalancesMockState } from '@/tests/balancesMock';
import type { LendingMarketAdapter } from '@/domains/markets/types';

import { useLoanForm } from '../useLoanForm';

const balances = vi.hoisted(() => ({}) as BalancesMockState);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('@/tests/balancesMock')).createBalancesMock(
    importOriginal,
    balances,
  ),
);

const CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const LOWER_CASE = CHECKSUMMED.toLowerCase();

const renderForm = async (
  walletFamily: 'evm' | 'sol' | undefined,
  {
    connected = true,
    adapter = createFakeAdapter(),
  }: { connected?: boolean; adapter?: LendingMarketAdapter } = {},
) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <MarketAdaptersProvider adapters={[adapter]}>
        {children}
      </MarketAdaptersProvider>
    </QueryClientProvider>
  );

  const hook = renderHook(() => useLoanForm({ connected, walletFamily }), {
    wrapper,
  });

  await waitFor(() => expect(hook.result.current.market).toBeDefined());

  return hook.result;
};

beforeEach(() => {
  Object.assign(balances, emptyBalances());
});

describe('useLoanForm borrowRequest recipient', () => {
  const ETH = {
    assetId: 'nep141:base.omft.near',
    symbol: 'ETH',
    blockchain: 'base',
    decimals: 18,
    price: 3000,
  };

  /**
   * A 1 ETH loan from the 1.5 ETH held: the call to action is ready unless
   * the recipient blocks it.
   */
  const renderLoan = async (walletFamily: 'evm' | 'sol') => {
    const empty = emptyBalances();

    balances.wallet = {
      ...empty.wallet,
      status: 'success',
      tokens: [ETH],
      balances: { [ETH.assetId]: '1500000000000000000' },
    };
    balances.supported = {
      ...empty.supported,
      status: 'success',
      origins: [{ assetId: ETH.assetId }],
    };

    const form = await renderForm(walletFamily);

    act(() => form.current.setAmount('1'));

    return form;
  };

  it('is unset for an EVM wallet with the box off, whatever was typed', async () => {
    const form = await renderLoan('evm');

    expect(form.current.recipientRequired).toBe(false);
    expect(form.current.borrowRequest).toBeDefined();
    expect(form.current.borrowRequest?.recipient).toBeUndefined();

    act(() => form.current.setRecipient(CHECKSUMMED));

    expect(form.current.borrowRequest).toBeDefined();
    expect(form.current.borrowRequest?.recipient).toBeUndefined();
  });

  it('holds the borrow back with the box on and an invalid address', async () => {
    const form = await renderLoan('evm');

    act(() => form.current.setRecipientEnabled(true));
    act(() => form.current.setRecipient('name.eth'));

    expect(form.current.borrowRequest).toBeUndefined();
  });

  it('is the address, trimmed, with the box on and a valid address', async () => {
    const form = await renderLoan('evm');

    act(() => form.current.setRecipientEnabled(true));
    act(() => form.current.setRecipient(` ${CHECKSUMMED} `));

    expect(form.current.borrowRequest?.recipient).toBe(CHECKSUMMED);

    // `validateRecipient` hands a valid address back as entered.
    act(() => form.current.setRecipient(LOWER_CASE));

    expect(form.current.borrowRequest?.recipient).toBe(LOWER_CASE);
  });

  it('is the address for a Solana wallet once a valid one is typed, with the box locked on', async () => {
    const form = await renderLoan('sol');

    expect(form.current.recipientRequired).toBe(true);
    expect(form.current.recipientEnabled).toBe(true);
    expect(form.current.borrowRequest).toBeUndefined();

    // Can't be turned off.
    act(() => form.current.setRecipientEnabled(false));

    expect(form.current.recipientEnabled).toBe(true);

    act(() => form.current.setRecipient(CHECKSUMMED));

    expect(form.current.borrowRequest?.recipient).toBe(CHECKSUMMED);
  });
});

describe('useLoanForm market', () => {
  /** Not connected: WETH at the oracle's $3,000, LTV 50%. */
  const renderDisconnected = (adapter?: LendingMarketAdapter) =>
    renderForm(undefined, { connected: false, adapter });

  it('is Aave on its chosen chain, Arbitrum, the lower APR', async () => {
    const form = await renderDisconnected();

    expect(form.current.market?.id).toBe(FAKE_ARB.id);
    expect(form.current.figuresMarket?.id).toBe(FAKE_ARB.id);
    expect(form.current.liquidationLtvBps).toBe(8250);
    expect(form.current.disabledMarketIds).toEqual([]);
  });

  it('moves to Base when the loan outgrows Arbitrum’s liquidity, and back', async () => {
    const form = await renderDisconnected();

    // 300,000 WETH is $900M; at LTV 50%, $450M: above Arbitrum's $356M,
    // within Base's $1.2B.
    act(() => form.current.setAmount('300000'));

    expect(form.current.loanUsd).toBe(450_000_000);
    expect(form.current.market?.id).toBe(FAKE_BASE.id);
    expect(form.current.liquidationLtvBps).toBe(8100);

    act(() => form.current.setAmount('1'));

    expect(form.current.market?.id).toBe(FAKE_ARB.id);
  });

  it('moves to Base when a higher LTV outgrows Arbitrum’s liquidity', async () => {
    const form = await renderDisconnected();

    // 200,000 WETH is $600M: $300M at LTV 50%, $420M at 70%.
    act(() => form.current.setAmount('200000'));

    expect(form.current.market?.id).toBe(FAKE_ARB.id);

    act(() => form.current.setLtv(70));

    expect(form.current.market?.id).toBe(FAKE_BASE.id);
  });

  it('moves to the chain that has the pair when the pair changes', async () => {
    const adapter = createFakeAdapter({
      getMarketSnapshot: async (market) =>
        market.id === FAKE_BASE.id
          ? pairSnapshot(FAKE_BASE, {
              borrowable: [
                usdc(),
                usdc({
                  asset: '0x0000000000000000000000000000000000000003',
                  symbol: 'USDT',
                  assetId: 'nep141:usdt',
                }),
              ],
            })
          : readFakeSnapshot(market),
    });

    const form = await renderDisconnected(adapter);

    expect(form.current.market?.id).toBe(FAKE_ARB.id);

    // Only Base lends USDT.
    act(() => form.current.setBorrowSymbol('USDT'));

    expect(form.current.pair).toEqual({ collateral: 'WETH', borrow: 'USDT' });
    expect(form.current.market?.id).toBe(FAKE_BASE.id);
  });

  it('has no loan size, so every chain counts, before an amount is typed', async () => {
    const shallowArb = FAKE_SNAPSHOTS[FAKE_ARB.id];
    const adapter = createFakeAdapter({
      getMarketSnapshot: async (market) =>
        market.id === FAKE_ARB.id && shallowArb
          ? {
              ...shallowArb,
              borrowable: [
                usdc({ variableBorrowApr: 0.0441, availableLiquidity: 0n }),
              ],
            }
          : readFakeSnapshot(market),
    });

    const form = await renderDisconnected(adapter);

    expect(form.current.loanUsd).toBeUndefined();
    expect(form.current.market?.id).toBe(FAKE_ARB.id);

    act(() => form.current.setAmount('1'));

    expect(form.current.market?.id).toBe(FAKE_BASE.id);
  });

  it('picks by provider and keeps the pick on its chosen chain', async () => {
    const form = await renderDisconnected();

    act(() => form.current.pickMarket(FAKE_ARB.provider));

    expect(form.current.market?.id).toBe(FAKE_ARB.id);

    act(() => form.current.setAmount('300000'));

    expect(form.current.market?.id).toBe(FAKE_BASE.id);
  });

  it('lists a provider the LTV is too high for by its provider id', async () => {
    const form = await renderDisconnected();

    // Above Arbitrum's max LTV of 80%.
    act(() => form.current.setLtv(81));

    expect(form.current.disabledMarketIds).toEqual([FAKE_ARB.provider]);
    expect(form.current.market).toBeUndefined();
    // The chosen chain stands in for the figures.
    expect(form.current.figuresMarket?.id).toBe(FAKE_ARB.id);
  });
});
