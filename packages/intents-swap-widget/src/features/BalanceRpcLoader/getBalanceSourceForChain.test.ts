import { getBalanceSourceForChain } from './getBalanceSourceForChain';

describe('getBalanceSourceForChain', () => {
  it('uses Alchemy exclusively for a supported chain when configured', () => {
    expect(
      getBalanceSourceForChain({
        alchemyApiKey: 'alchemy-key',
        chain: 'eth',
        rpcs: { eth: ['https://eth.example'] },
      }),
    ).toBe('alchemy');
  });

  it('uses RPC when no Alchemy key is configured', () => {
    expect(
      getBalanceSourceForChain({
        chain: 'eth',
        rpcs: { eth: ['https://eth.example'] },
      }),
    ).toBe('rpc');
  });

  it('uses RPC for a chain unsupported by Alchemy', () => {
    expect(
      getBalanceSourceForChain({
        alchemyApiKey: 'alchemy-key',
        chain: 'aurora',
        rpcs: { aurora: ['https://mainnet.aurora.dev'] },
      }),
    ).toBe('rpc');
  });

  it('returns none when neither source is available', () => {
    expect(
      getBalanceSourceForChain({
        chain: 'btc',
        rpcs: {},
      }),
    ).toBe('none');
  });
});
