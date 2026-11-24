import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketAdaptersProvider } from '../markets/MarketAdaptersProvider';
import { type BalancesMockState, emptyBalances } from '../tests/balancesMock';
import { createFakeAdapter, createTestQueryClient } from '../tests/fakeMarkets';
import { useLoanForm } from './useLoanForm';

const balances = vi.hoisted(() => ({}) as BalancesMockState);

vi.mock('@aurora-is-near/intents-connect/react', async (importOriginal) =>
  (await import('../tests/balancesMock')).createBalancesMock(
    importOriginal,
    balances,
  ),
);

const CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const LOWER_CASE = CHECKSUMMED.toLowerCase();

const renderForm = async (walletFamily: 'evm' | 'sol') => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      <MarketAdaptersProvider adapters={[createFakeAdapter()]}>
        {children}
      </MarketAdaptersProvider>
    </QueryClientProvider>
  );

  const hook = renderHook(
    () => useLoanForm({ connected: true, walletFamily }),
    { wrapper },
  );

  await waitFor(() => expect(hook.result.current.marketsSettled).toBe(true));

  return hook.result;
};

beforeEach(() => {
  Object.assign(balances, emptyBalances());
});

describe('useLoanForm recipientAddress', () => {
  it('is undefined for an EVM wallet with the box off, whatever was typed', async () => {
    const form = await renderForm('evm');

    expect(form.current.recipientRequired).toBe(false);
    expect(form.current.recipientAddress).toBeUndefined();

    act(() => form.current.setRecipient(CHECKSUMMED));

    expect(form.current.recipientAddress).toBeUndefined();
  });

  it('is undefined with the box on and an invalid address', async () => {
    const form = await renderForm('evm');

    act(() => form.current.setRecipientEnabled(true));
    act(() => form.current.setRecipient('name.eth'));

    expect(form.current.recipientAddress).toBeUndefined();
  });

  it('is the address, trimmed, with the box on and a valid address', async () => {
    const form = await renderForm('evm');

    act(() => form.current.setRecipientEnabled(true));
    act(() => form.current.setRecipient(` ${CHECKSUMMED} `));

    expect(form.current.recipientAddress).toBe(CHECKSUMMED);

    // `validateRecipient` hands a valid address back as entered.
    act(() => form.current.setRecipient(LOWER_CASE));

    expect(form.current.recipientAddress).toBe(LOWER_CASE);
  });

  it('is the address for a Solana wallet once a valid one is typed, with the box locked on', async () => {
    const form = await renderForm('sol');

    expect(form.current.recipientRequired).toBe(true);
    expect(form.current.recipientEnabled).toBe(true);
    expect(form.current.recipientAddress).toBeUndefined();

    // Can't be turned off.
    act(() => form.current.setRecipientEnabled(false));

    expect(form.current.recipientEnabled).toBe(true);

    act(() => form.current.setRecipient(CHECKSUMMED));

    expect(form.current.recipientAddress).toBe(CHECKSUMMED);
  });
});
