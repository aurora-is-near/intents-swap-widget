import { getSolanaRpcUrls } from './getSolanaRpcUrls';

describe('getSolanaRpcUrls', () => {
  it('returns the configured RPCs when no Alchemy key is set', () => {
    expect(
      getSolanaRpcUrls({
        rpcs: { sol: ['https://solana-rpc.publicnode.com'] },
      }),
    ).toEqual(['https://solana-rpc.publicnode.com']);
  });

  it('prefers Alchemy with the configured RPCs as failover', () => {
    expect(
      getSolanaRpcUrls({
        alchemyApiKey: 'test-key',
        rpcs: { sol: ['https://solana-rpc.publicnode.com'] },
      }),
    ).toEqual([
      'https://solana-mainnet.g.alchemy.com/v2/test-key',
      'https://solana-rpc.publicnode.com',
    ]);
  });

  it('returns no URLs without a key or configured RPCs', () => {
    expect(getSolanaRpcUrls({ rpcs: {} })).toEqual([]);
  });
});
