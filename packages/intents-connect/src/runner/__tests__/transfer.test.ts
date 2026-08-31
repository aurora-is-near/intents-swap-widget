import { describe, expect, it, vi } from 'vitest';

import { GuardError } from '@/errors';
import type { MakeTransferArgs } from '@/types/transfer';
import type { WalletConnector } from '@/types/wallet';
import { findTransfer, requireTransfer } from '@/runner/transfer';

const args: MakeTransferArgs = {
  amountAtomic: '100',
  decimals: 6,
  address: 'deposit-address',
  chain: 'base',
};

const makeWallet = (
  overrides: Partial<WalletConnector> = {},
): WalletConnector => ({
  id: 'test',
  name: 'Test',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => '0xUser',
  getProviders: () => ({}),
  ...overrides,
});

describe('findTransfer', () => {
  it('prefers the explicit override over everything else', async () => {
    const override = vi.fn().mockResolvedValue({ hash: '0xoverride' });
    const walletTransfer = vi.fn().mockResolvedValue({ hash: '0xwallet' });

    const transfer = findTransfer(
      {
        getWallet: () => makeWallet({ makeTransfer: walletTransfer }),
        makeTransferOverride: override,
        plugins: { evm: { makeTransfer: vi.fn() } },
      },
      'base',
    );

    await expect(transfer?.(args)).resolves.toEqual({ hash: '0xoverride' });
    expect(override).toHaveBeenCalledWith(args, undefined);
    expect(walletTransfer).not.toHaveBeenCalled();
  });

  it('prefers the connector transfer over plugins and keeps its `this`', async () => {
    const pluginTransfer = vi.fn();
    const wallet = makeWallet();

    wallet.makeTransfer = function makeTransfer(this: WalletConnector) {
      return Promise.resolve({ hash: `bound:${this.id}` });
    };

    const transfer = findTransfer(
      {
        getWallet: () => wallet,
        plugins: { evm: { makeTransfer: pluginTransfer } },
      },
      'base',
    );

    await expect(transfer?.(args)).resolves.toEqual({ hash: 'bound:test' });
    expect(pluginTransfer).not.toHaveBeenCalled();
  });

  it('falls back to the chain-family plugin with namespaced options sliced', async () => {
    const pluginTransfer = vi.fn().mockResolvedValue({ hash: '0xplugin' });

    const transfer = findTransfer(
      {
        getWallet: () => makeWallet(),
        plugins: { evm: { makeTransfer: pluginTransfer } },
        pluginOptions: { evm: { provider: 'evm-provider' }, sol: {} },
      },
      'base',
    );

    await expect(transfer?.(args)).resolves.toEqual({ hash: '0xplugin' });
    expect(pluginTransfer).toHaveBeenCalledWith(args, {
      provider: 'evm-provider',
    });
  });

  it('passes flat (single-family) plugin options through unchanged', async () => {
    const pluginTransfer = vi.fn().mockResolvedValue({ hash: '0xplugin' });
    const options = { provider: 'flat-provider' };

    const transfer = findTransfer(
      {
        getWallet: () => makeWallet(),
        plugins: { evm: { makeTransfer: pluginTransfer } },
        pluginOptions: options,
      },
      'base',
    );

    await transfer?.(args);

    expect(pluginTransfer).toHaveBeenCalledWith(args, options);
  });

  it('returns undefined when nothing is configured or the family is unknown', () => {
    expect(
      findTransfer({ getWallet: () => makeWallet() }, 'base'),
    ).toBeUndefined();
    expect(
      findTransfer(
        {
          getWallet: () => makeWallet(),
          plugins: { evm: { makeTransfer: vi.fn() } },
        },
        'btc',
      ),
    ).toBeUndefined();
  });
});

describe('requireTransfer', () => {
  it('throws NO_TRANSFER_IMPLEMENTATION at resolution, not invocation', () => {
    const call = () =>
      requireTransfer({ getWallet: () => makeWallet() }, 'base');

    expect(call).toThrowError(GuardError);

    try {
      call();
    } catch (error) {
      expect((error as GuardError).code).toBe('NO_TRANSFER_IMPLEMENTATION');
    }
  });
});
