import { describe, expect, it, vi } from 'vitest';

import {
  BalanceRpcError,
  type BalanceToken,
  getBalanceFamily,
} from '@/balances';
import { readTronBalances } from '@/balances/tron';

const ADDRESS = 'TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const TRX: BalanceToken = {
  assetId: 'nep141:tron.omft.near',
  symbol: 'TRX',
  blockchain: 'tron',
  decimals: 6,
  price: 0.3,
};

const USDT: BalanceToken = {
  assetId: 'nep141:tron-d28a265909efecdcee7c5028585214ea0b96f015.omft.near',
  symbol: 'USDT',
  blockchain: 'tron',
  decimals: 6,
  contractAddress: USDT_CONTRACT,
  price: 1,
};

const respond = (status: number, body: unknown) =>
  vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }));

describe('readTronBalances', () => {
  it('reads TRX and the TRC-20s by contract, in one call', async () => {
    const fetch = respond(200, {
      success: true,
      data: [
        {
          balance: 12_500_000,
          trc20: [{ TOTHER: '7' }, { [USDT_CONTRACT]: '3250000' }],
        },
      ],
    });

    const balances = await readTronBalances({
      address: ADDRESS,
      tokens: [TRX, USDT],
      apiUrls: ['https://trongrid.test/'],
      apiKey: 'key',
      fetch: fetch as never,
    });

    expect(balances).toEqual({
      [TRX.assetId]: '12500000',
      [USDT.assetId]: '3250000',
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://trongrid.test/v1/accounts/${ADDRESS}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'TRON-PRO-API-KEY': 'key' },
      }),
    );
  });

  it('reads an account that was never activated as holding nothing', async () => {
    const balances = await readTronBalances({
      address: ADDRESS,
      tokens: [TRX, USDT],
      apiUrls: ['https://trongrid.test'],
      fetch: respond(200, { success: true, data: [] }) as never,
    });

    expect(balances).toEqual({ [TRX.assetId]: '0', [USDT.assetId]: '0' });
  });

  it('tries the next endpoint past a rate limit, and fails when none answers', async () => {
    const limited = respond(403, { Error: 'request rate exceeded' });

    await expect(
      readTronBalances({
        address: ADDRESS,
        tokens: [TRX],
        apiUrls: ['https://a.test', 'https://b.test'],
        fetch: limited as never,
      }),
    ).rejects.toBeInstanceOf(BalanceRpcError);
    expect(limited).toHaveBeenCalledTimes(2);
  });

  it('shares one read of an account between callers a moment apart', async () => {
    const fetch = respond(200, { success: true, data: [{ balance: 1 }] });
    const read = () =>
      readTronBalances({
        address: ADDRESS,
        tokens: [TRX],
        apiUrls: ['https://shared.test'],
        fetch: fetch as never,
      });

    await read();

    await expect(read()).resolves.toEqual({ [TRX.assetId]: '1' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('is the family TRON balances are read for', () => {
    expect(getBalanceFamily('tron')).toBe('tron');
  });
});
