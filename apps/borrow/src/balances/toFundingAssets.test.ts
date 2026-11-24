import type {
  BalanceToken,
  SupportedToken,
} from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import {
  type FundingToken,
  NOT_SUPPORTED_REASON,
  toFundingAssets,
} from './toFundingAssets';

const ETH: BalanceToken = {
  assetId: 'nep141:eth.omft.near',
  symbol: 'ETH',
  blockchain: 'eth',
  decimals: 18,
  price: 3000,
};

const USDC: BalanceToken = {
  assetId: 'nep141:base-usdc.omft.near',
  symbol: 'USDC',
  blockchain: 'base',
  decimals: 6,
  contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  price: 1,
};

const MEME: FundingToken = {
  assetId: 'nep141:base-meme.omft.near',
  symbol: 'MEME',
  blockchain: 'base',
  decimals: 18,
  contractAddress: '0x0000000000000000000000000000000000000001',
};

const TOKENS = [ETH, USDC, MEME];
const ORIGINS: SupportedToken[] = [ETH, USDC, MEME].map(({ assetId }) => ({
  assetId,
}));

describe('toFundingAssets', () => {
  it('drops zero balances and tokens it cannot name', () => {
    const rows = toFundingAssets(
      {
        [ETH.assetId]: '0',
        [USDC.assetId]: '2500000',
        'nep141:unknown.near': '5',
      },
      TOKENS,
      ORIGINS,
    );

    expect(rows.map((row) => row.symbol)).toEqual(['USDC']);
  });

  it('maps a balance to a row', () => {
    expect(
      toFundingAssets({ [USDC.assetId]: '2500000' }, TOKENS, ORIGINS),
    ).toEqual([
      {
        assetId: USDC.assetId,
        symbol: 'USDC',
        chain: 'base',
        decimals: 6,
        amount: 2_500_000n,
        usdValue: 2.5,
        unavailableReason: undefined,
      },
    ]);
  });

  it('sorts by USD value, highest first, with unpriced rows last', () => {
    const rows = toFundingAssets(
      {
        [MEME.assetId]: '1000000000000000000000',
        [USDC.assetId]: '2500000000', // $2,500
        [ETH.assetId]: '1000000000000000000', // $3,000
      },
      TOKENS,
      ORIGINS,
    );

    expect(rows.map((row) => row.symbol)).toEqual(['ETH', 'USDC', 'MEME']);
  });

  it('marks a token that cannot be a bridge-in origin as unavailable', () => {
    const rows = toFundingAssets(
      { [ETH.assetId]: '1', [MEME.assetId]: '1' },
      TOKENS,
      [{ assetId: ETH.assetId }],
    );

    expect(rows.find((row) => row.symbol === 'MEME')).toMatchObject({
      unavailableReason: NOT_SUPPORTED_REASON,
    });
    expect(
      rows.find((row) => row.symbol === 'ETH')?.unavailableReason,
    ).toBeUndefined();
  });

  it('marks nothing while the origins are unknown', () => {
    const rows = toFundingAssets({ [MEME.assetId]: '1' }, TOKENS, undefined);

    expect(rows[0]?.unavailableReason).toBeUndefined();
  });

  it('checks native NEAR as wNEAR', () => {
    const near: BalanceToken = {
      assetId: 'native-near',
      symbol: 'NEAR',
      blockchain: 'near',
      decimals: 24,
      price: 3,
    };

    const rows = toFundingAssets(
      { 'native-near': '1' },
      [near],
      [{ assetId: 'nep141:wrap.near' }],
    );

    expect(rows[0]?.unavailableReason).toBeUndefined();
  });

  it('gives no USD value, not 0, when the price is missing', () => {
    const [row] = toFundingAssets(
      { [MEME.assetId]: '1000000000000000000' },
      TOKENS,
      ORIGINS,
    );

    expect(row).toBeDefined();
    expect(row?.usdValue).toBeUndefined();
  });
});
