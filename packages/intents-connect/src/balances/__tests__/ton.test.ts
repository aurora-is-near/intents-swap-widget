import { describe, expect, it, vi } from 'vitest';

import {
  BalanceRpcError,
  type BalanceToken,
  getBalanceFamily,
} from '@/balances';
import { readTonBalances } from '@/balances/ton';

const ADDRESS = 'UQBNrjsFcpvNu5LZWuTuYQiQC0VeiBOmogFAzrP7AJOnWsaE';
const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const USDT_MASTER_RAW =
  '0:B113A994B5024A16719F69139328EB759596C38A25F59028B146FECDC3621DFE';

const TON: BalanceToken = {
  assetId: 'nep245:v2_1.omni.hot.tg:1117_',
  symbol: 'TON',
  blockchain: 'ton',
  decimals: 9,
  price: 3,
};

const USDT: BalanceToken = {
  assetId:
    'nep245:v2_1.omni.hot.tg:1117_3tsdfyziyc7EJbP2aULWSKU4toBaAcN4FdTgfm5W1mC4ouR',
  symbol: 'USDT',
  blockchain: 'ton',
  decimals: 6,
  contractAddress: USDT_MASTER,
  price: 1,
};

const toncenter = (routes: Record<string, unknown>, status = 200) =>
  vi.fn(async (url: string) => {
    const [, body] =
      Object.entries(routes).find(([path]) => url.includes(path)) ?? [];

    return {
      ok: status === 200 && body !== undefined,
      status: body === undefined ? 404 : status,
      text: async () => JSON.stringify(body ?? {}),
    };
  });

describe('readTonBalances', () => {
  it('reads TON, then the jettons by master in any address form', async () => {
    const fetch = toncenter({
      walletInformation: { balance: '75429303465', status: 'active' },
      'jetton/wallets': {
        jetton_wallets: [
          { jetton: '0:2A48678C63', balance: '1' },
          { jetton: USDT_MASTER_RAW, balance: '407049395' },
        ],
      },
    });

    const balances = await readTonBalances({
      address: ADDRESS,
      tokens: [TON, USDT],
      apiUrls: ['https://toncenter.test/'],
      apiKey: 'key',
      fetch: fetch as never,
    });

    expect(balances).toEqual({
      [TON.assetId]: '75429303465',
      [USDT.assetId]: '407049395',
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://toncenter.test/api/v3/walletInformation?address=${ADDRESS}&use_v2=false`,
      expect.objectContaining({ headers: { 'X-API-Key': 'key' } }),
    );
  });

  it('reads a wallet that holds no jettons as zero, and skips them when only TON is asked', async () => {
    const fetch = toncenter({
      walletInformation: { balance: '0', status: 'nonexist' },
      'jetton/wallets': { jetton_wallets: [] },
    });

    await expect(
      readTonBalances({
        address: ADDRESS,
        tokens: [TON, USDT],
        apiUrls: ['https://a.test'],
        apiKey: 'key',
        fetch: fetch as never,
      }),
    ).resolves.toEqual({ [TON.assetId]: '0', [USDT.assetId]: '0' });

    const onlyTon = toncenter({ walletInformation: { balance: '5' } });

    await readTonBalances({
      address: ADDRESS,
      tokens: [TON],
      apiUrls: ['https://b.test'],
      apiKey: 'key',
      fetch: onlyTon as never,
    });

    expect(onlyTon).toHaveBeenCalledTimes(1);
  });

  it('tries the next endpoint, and fails when none answers', async () => {
    const down = toncenter({}, 503);

    await expect(
      readTonBalances({
        address: ADDRESS,
        tokens: [TON],
        apiUrls: ['https://a.test', 'https://b.test'],
        fetch: down as never,
      }),
    ).rejects.toBeInstanceOf(BalanceRpcError);
    expect(down).toHaveBeenCalledTimes(2);
  });

  it('shares one read of an account between callers a moment apart', async () => {
    const fetch = toncenter({ walletInformation: { balance: '1' } });
    const read = () =>
      readTonBalances({
        address: ADDRESS,
        tokens: [TON],
        apiUrls: ['https://shared.test'],
        apiKey: 'key',
        fetch: fetch as never,
      });

    await read();

    await expect(read()).resolves.toEqual({ [TON.assetId]: '1' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('is the family TON balances are read for', () => {
    expect(getBalanceFamily('ton')).toBe('ton');
  });
});
