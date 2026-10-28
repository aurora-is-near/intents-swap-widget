import { alchemyApi } from '@/network';

import { createLoader } from './load';

jest.mock('@/network', () => ({ alchemyApi: { post: jest.fn() } }));

const EVM_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const SOL_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

const mockPost = alchemyApi.post as jest.Mock;

const load = createLoader({ alchemyApiKey: 'key' });

const getRequestedPairs = () =>
  (mockPost.mock.calls[0]?.[1] as { addresses: unknown }).addresses;

describe('createLoader', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({
      data: { data: { pageKey: null, tokens: [] } },
    });
  });

  it('queries each address only on networks of its own chain family', async () => {
    await load({
      pageParam: null,
      supportedChains: ['eth', 'base', 'sol'],
      connectedWallets: { default: EVM_ADDRESS, sol: SOL_ADDRESS },
    });

    expect(getRequestedPairs()).toEqual([
      { address: EVM_ADDRESS, networks: ['eth-mainnet', 'base-mainnet'] },
      { address: SOL_ADDRESS, networks: ['solana-mainnet'] },
    ]);
  });

  it('skips Solana when it is not a supported chain', async () => {
    const result = await load({
      pageParam: null,
      supportedChains: ['eth'],
      connectedWallets: { sol: SOL_ADDRESS },
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(result).toEqual({ pageKey: null, data: [] });
  });

  it('skips addresses Alchemy cannot index', async () => {
    await load({
      pageParam: null,
      supportedChains: ['eth', 'sol'],
      connectedWallets: { default: EVM_ADDRESS, near: 'alice.near' },
    });

    expect(getRequestedPairs()).toEqual([
      { address: EVM_ADDRESS, networks: ['eth-mainnet'] },
    ]);
  });

  it('dedupes an address connected under several keys', async () => {
    await load({
      pageParam: null,
      supportedChains: ['sol'],
      connectedWallets: { default: SOL_ADDRESS, sol: SOL_ADDRESS },
    });

    expect(getRequestedPairs()).toEqual([
      { address: SOL_ADDRESS, networks: ['solana-mainnet'] },
    ]);
  });
});
