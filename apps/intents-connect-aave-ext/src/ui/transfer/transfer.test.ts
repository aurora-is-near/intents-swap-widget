import type { ExecutionPlan } from '@aurora-is-near/intents-connect';
import { describe, expect, it, vi } from 'vitest';

import { exchangeNetwork } from './networks';
import { filterOrigins, transferOrigins } from './origins';
import {
  TRANSFER_WINDOW_MS,
  transferPreviewer,
  withTransferFunding,
} from './preview';

const token = (
  symbol: string,
  blockchain: string,
  extra: Record<string, unknown> = {},
) => ({
  assetId: `nep141:${blockchain}-${symbol.toLowerCase()}.omft.near`,
  symbol,
  blockchain,
  decimals: 6,
  price: 1,
  contractAddress: `0x${symbol}`,
  ...extra,
});

describe('transferOrigins', () => {
  it('keeps the chains a transfer can be paid from, most asked for first', () => {
    const rows = transferOrigins([
      token('BRETT', 'base'),
      token('USDT', 'tron'),
      token('XLM', 'stellar'),
      token('USDT', 'ton'),
      token('USDC', 'base'),
      token('USDC', 'eth'),
      token('wNEAR', 'near'),
      token('SOL', 'sol', { contractAddress: '' }),
    ]);

    expect(
      rows.map((row) => `${row.token.symbol}:${row.token.blockchain}`),
    ).toEqual([
      'USDC:eth',
      'USDC:base',
      'USDT:tron',
      'SOL:sol',
      'BRETT:base',
      'wNEAR:near',
    ]);
    expect(rows.map((row) => row.family)).toEqual([
      'evm',
      'evm',
      'tron',
      'sol',
      'evm',
      'near',
    ]);
  });

  it('maps rows to the token a plan is built from', () => {
    const [sol] = transferOrigins([
      token('SOL', 'sol', { contractAddress: '', price: undefined }),
    ]);

    expect(sol?.token).toEqual({
      assetId: 'nep141:sol-sol.omft.near',
      symbol: 'SOL',
      blockchain: 'sol',
      decimals: 6,
      contractAddress: undefined,
      price: 0,
    });
  });

  it('leaves out incomplete, deprecated, test and repeated rows', () => {
    expect(
      transferOrigins([
        { ...token('USDC', 'base'), decimals: undefined },
        { ...token('USDC', 'arb'), assetId: undefined },
        token('USDT0(DEPRECATED)', 'arb'),
        token('XPL_(DEPRECATED)', 'plasma'),
        token('TESTNEBULA', 'near'),
        token('USDC', 'op'),
        token('USDC', 'op'),
      ]).map((row) => row.id),
    ).toEqual(['nep141:op-usdc.omft.near']);
  });
});

describe('filterOrigins', () => {
  const rows = transferOrigins([token('USDC', 'base'), token('USDT', 'tron')]);
  const chainName = (chain: string) =>
    ({ base: 'Base', tron: 'TRON' })[chain] ?? chain;

  it('matches the symbol or the chain name', () => {
    expect(
      filterOrigins(rows, 'usdt', chainName).map((row) => row.token.symbol),
    ).toEqual(['USDT']);
    expect(
      filterOrigins(rows, ' Bas', chainName).map((row) => row.token.symbol),
    ).toEqual(['USDC']);
    expect(filterOrigins(rows, '', chainName)).toBe(rows);
  });
});

describe('exchangeNetwork', () => {
  it('names networks as exchanges do, else by chain name', () => {
    expect(exchangeNetwork('tron', () => 'x')).toBe('TRON (TRC-20)');
    expect(exchangeNetwork('bsc', () => 'x')).toBe('BNB Smart Chain (BEP-20)');
    expect(exchangeNetwork('hood', () => 'Robinhood')).toBe('Robinhood');
  });
});

describe('transfer funding', () => {
  const plan = {
    quote: { originAsset: 'a', destinationAsset: 'b', amount: '1' },
    depositViaWallet: true,
  } as unknown as ExecutionPlan<void>;

  it('previews the same plan as a transfer, with a fresh window', async () => {
    const preview = vi.fn().mockResolvedValue('previewed');
    const now = Date.parse('2026-11-06T12:00:00Z');

    vi.useFakeTimers({ now });
    await transferPreviewer({ preview }).preview(plan);
    vi.useRealTimers();

    expect(preview).toHaveBeenCalledWith({
      quote: {
        ...plan.quote,
        deadline: new Date(now + TRANSFER_WINDOW_MS).toISOString(),
      },
      depositViaWallet: false,
    });
    // The dApp's plan is left as it was.
    expect(plan.depositViaWallet).toBe(true);
  });

  it('stamps 30 minutes from now', () => {
    expect(withTransferFunding(plan, 0).quote.deadline).toBe(
      '1970-01-01T00:30:00.000Z',
    );
  });
});
