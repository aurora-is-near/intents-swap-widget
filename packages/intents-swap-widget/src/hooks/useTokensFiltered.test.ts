import { renderHook } from '@testing-library/react';

import type { Token } from '@/types/token';
import type { Chains } from '@/types/chain';

import { useTokensFiltered } from './useTokensFiltered';

// Mock only the data-source hooks; the real filter/sort utils run so the test
// exercises the actual filtering pipeline (including the isAllowedChain guard).
const mockUseTokens = jest.fn();
const mockUseTokensIntentsUnique = jest.fn();
const mockUseConfig = jest.fn();

jest.mock('./useChains', () => ({ useChains: () => [] }));
jest.mock('./useTokens', () => ({ useTokens: () => mockUseTokens() }));
jest.mock('./useMergedBalance', () => ({
  useMergedBalance: () => ({ mergedBalance: {} }),
}));
jest.mock('./useIntentsBalance', () => ({
  useIntentsBalance: () => ({ intentBalances: {} }),
}));
jest.mock('./useTokensIntentsUnique', () => ({
  useTokensIntentsUnique: () => mockUseTokensIntentsUnique(),
}));
jest.mock('./useTokenVolumeStats', () => ({
  useTokenVolumeStats: () => ({ volumeRank: new Map() }),
}));
jest.mock('../config', () => ({ useConfig: () => mockUseConfig() }));

const makeToken = (overrides: Partial<Token>): Token => ({
  assetId: 'nep141:test.near',
  symbol: 'TEST',
  name: 'Test',
  chainName: 'Test',
  blockchain: 'near' as Chains,
  decimals: 18,
  price: 1,
  icon: '',
  isIntent: false,
  ...overrides,
});

const intentsNearToken = makeToken({
  assetId: 'nep141:wrap.near',
  symbol: 'NEAR',
  name: 'NEAR',
  blockchain: 'near',
  isIntent: true,
});

const walletNearToken = makeToken({
  assetId: 'nep141:near-native',
  symbol: 'NEAR',
  blockchain: 'near',
  isIntent: false,
});

const walletEthToken = makeToken({
  assetId: 'nep141:eth.omft.near',
  symbol: 'ETH',
  name: 'Ether',
  chainName: 'Ethereum',
  blockchain: 'eth',
  isIntent: false,
});

describe('useTokensFiltered', () => {
  beforeEach(() => {
    mockUseTokens.mockReturnValue({
      tokens: [intentsNearToken, walletNearToken, walletEthToken],
    });
    mockUseTokensIntentsUnique.mockReturnValue({
      uniqueIntentsTokens: [intentsNearToken],
    });
  });

  const render = () =>
    renderHook(() =>
      useTokensFiltered({
        variant: 'source',
        search: '',
        selectedChain: 'all',
        chainsFilter: { intents: 'all', external: 'all' },
        supportedChains: [],
        priorityAssets: [],
      }),
    ).result.current;

  it('keeps a NEAR-blockchain Intents balance when "near" is removed from allowedChainsList', () => {
    // The configurator deselecting the Near network drops 'near' from the list.
    mockUseConfig.mockReturnValue({ allowedChainsList: ['eth'] });

    const { intents, wallet } = render();

    // Intents balance survives even though its underlying blockchain ('near')
    // is no longer an allowed chain — it is the virtual account layer.
    expect(intents.map((t) => t.assetId)).toContain('nep141:wrap.near');

    // Control: a non-intent token on 'near' is still filtered out by the
    // allowed-chains list, so the guard is intents-only, not a blanket bypass.
    expect(wallet.map((t) => t.assetId)).not.toContain('nep141:near-native');
    expect(wallet.map((t) => t.assetId)).toContain('nep141:eth.omft.near');
  });

  it('shows every token when its blockchain is allowed', () => {
    mockUseConfig.mockReturnValue({ allowedChainsList: ['near', 'eth'] });

    const { intents, wallet } = render();

    expect(intents.map((t) => t.assetId)).toContain('nep141:wrap.near');
    expect(wallet.map((t) => t.assetId)).toEqual(
      expect.arrayContaining(['nep141:near-native', 'nep141:eth.omft.near']),
    );
  });
});
