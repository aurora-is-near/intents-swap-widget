import type { BalanceToken } from '@aurora-is-near/intents-connect';
import { describe, expect, it } from 'vitest';

import { balanceSources } from './intentsAccess';
import { intentsRows } from './useIntentsAssets';

const USDC: BalanceToken = {
  assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
  symbol: 'USDC',
  blockchain: 'base',
  decimals: 6,
  price: 1,
  contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
};

const WNEAR: BalanceToken = {
  assetId: 'nep141:wrap.near',
  symbol: 'wNEAR',
  blockchain: 'near',
  decimals: 24,
  price: 2,
};

describe('balanceSources', () => {
  it('gives EVM and NEAR wallets both intents lists', () => {
    expect(
      balanceSources({ family: 'evm', intentsAccountId: '0xabc' }),
    ).toEqual(['wallet', 'intents', 'confidential']);
    expect(
      balanceSources({ family: 'near', intentsAccountId: 'alice.near' }),
    ).toEqual(['wallet', 'intents', 'confidential']);
  });

  it('gives Solana wallets public intents balances only', () => {
    expect(balanceSources({ family: 'sol', intentsAccountId: 'ab12' })).toEqual(
      ['wallet', 'intents'],
    );
  });

  it('gives no intents lists where a supply could not be paid from them', () => {
    expect(balanceSources({ family: 'tron', intentsAccountId: 'T1' })).toEqual([
      'wallet',
    ]);
    expect(
      balanceSources({ family: 'stellar', intentsAccountId: 'G1' }),
    ).toEqual(['wallet']);
    expect(balanceSources({ family: 'evm' })).toEqual(['wallet']);
    expect(balanceSources({})).toEqual(['wallet']);
  });
});

describe('intentsRows', () => {
  it('joins balances with the token list, most valuable first', () => {
    const rows = intentsRows(
      'intents',
      [
        {
          tokenId: USDC.assetId,
          assetId: USDC.assetId,
          amount: '2500000',
          symbol: 'USDC',
          decimals: 6,
        },
        {
          tokenId: 'nep141:wrap.near',
          assetId: 'nep141:wrap.near',
          amount: '3000000000000000000000000',
          symbol: 'wNEAR',
          decimals: 24,
        },
      ],
      [USDC, WNEAR],
    );

    expect(rows.map((row) => [row.token.symbol, row.usd])).toEqual([
      ['wNEAR', 6],
      ['USDC', 2.5],
    ]);
    expect(rows[1]).toMatchObject({
      id: USDC.assetId,
      source: 'intents',
      tokenId: USDC.assetId,
      token: USDC,
      amount: '2500000',
    });
  });

  it('matches confidential balances by token id', () => {
    expect(
      intentsRows(
        'confidential',
        [{ tokenId: USDC.assetId, amount: '1000000' }],
        [USDC],
      ),
    ).toEqual([
      {
        id: USDC.assetId,
        source: 'confidential',
        tokenId: USDC.assetId,
        token: USDC,
        amount: '1000000',
        usd: 1,
      },
    ]);
  });

  it('drops zero balances and unknown tokens without decimals', () => {
    expect(
      intentsRows(
        'intents',
        [
          { tokenId: USDC.assetId, amount: '0' },
          { tokenId: 'nep141:mystery.near', amount: '5', decimals: null },
        ],
        [USDC],
      ),
    ).toEqual([]);
  });

  it('lists an unknown token with decimals as unavailable', () => {
    expect(
      intentsRows(
        'intents',
        [
          {
            tokenId: 'nep141:meme.near',
            assetId: 'nep141:meme.near',
            amount: '5000',
            symbol: 'MEME',
            decimals: 3,
          },
        ],
        [USDC],
      ),
    ).toEqual([
      {
        id: 'nep141:meme.near',
        source: 'intents',
        tokenId: 'nep141:meme.near',
        token: {
          assetId: 'nep141:meme.near',
          symbol: 'MEME',
          blockchain: 'near',
          decimals: 3,
          price: 0,
        },
        amount: '5000',
        unavailable: 'Not supported yet',
      },
    ]);
  });
});
