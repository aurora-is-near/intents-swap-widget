import { describe, expect, it, vi } from 'vitest';

import {
  BalanceRpcError,
  type BalanceToken,
  getBalanceFamily,
} from '@/balances';
import { readStellarBalances } from '@/balances/stellar';

const ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const XLM: BalanceToken = {
  assetId: 'nep245:xlm',
  symbol: 'XLM',
  blockchain: 'stellar',
  decimals: 7,
  price: 0.15,
};

const USDC: BalanceToken = {
  assetId: 'nep245:usdc',
  symbol: 'USDC',
  blockchain: 'stellar',
  decimals: 7,
  contractAddress: USDC_ISSUER,
  price: 1,
};

const respond = (status: number, body: unknown = {}) =>
  vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }));

describe('readStellarBalances', () => {
  it('reads spendable XLM (less the minimum balance) and a matching trustline', async () => {
    const fetch = respond(200, {
      subentry_count: 1,
      balances: [
        {
          asset_type: 'native',
          balance: '10.0000000',
          selling_liabilities: '0.5000000',
        },
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: USDC_ISSUER,
          balance: '3.2500000',
        },
        // Same code, another issuer: not this token.
        {
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: 'GOTHER',
          balance: '99.0000000',
        },
      ],
    });

    const balances = await readStellarBalances({
      address: ADDRESS,
      tokens: [XLM, USDC],
      horizonUrls: ['https://horizon.test/'],
      fetch: fetch as never,
    });

    // 10 − (2 + 1) × 0.5 − 0.5 = 8 XLM.
    expect(balances).toEqual({
      [XLM.assetId]: '80000000',
      [USDC.assetId]: '32500000',
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://horizon.test/accounts/${ADDRESS}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('reads an account that was never funded as holding nothing', async () => {
    const balances = await readStellarBalances({
      address: ADDRESS,
      tokens: [XLM, USDC],
      horizonUrls: ['https://horizon.test'],
      fetch: respond(404) as never,
    });

    expect(balances).toEqual({ [XLM.assetId]: '0', [USDC.assetId]: '0' });
  });

  it('tries the next endpoint, and fails when none answers', async () => {
    const down = respond(503);

    await expect(
      readStellarBalances({
        address: ADDRESS,
        tokens: [XLM],
        horizonUrls: ['https://a.test', 'https://b.test'],
        fetch: down as never,
      }),
    ).rejects.toBeInstanceOf(BalanceRpcError);
    expect(down).toHaveBeenCalledTimes(2);
  });

  it('is the family Stellar balances are read for', () => {
    expect(getBalanceFamily('stellar')).toBe('stellar');
  });
});
