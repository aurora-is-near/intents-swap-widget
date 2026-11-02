import type { Token } from '@/types/token';
import { createFilterBySelectedChain } from './filterBySelectedChain';

const token = (overrides: Partial<Token>): Token => ({
  assetId: 'nep141:eth.omft.near',
  symbol: 'ETH',
  blockchain: 'eth',
  decimals: 18,
  price: 1,
  icon: '',
  isIntent: false,
  chainName: 'Ethereum',
  name: 'Ether',
  ...overrides,
});

const eth = token({});
const usdcOnEth = token({ assetId: 'nep141:usdc-eth', symbol: 'USDC' });
const sol = token({ assetId: 'nep141:sol.omft.near', blockchain: 'sol' });

const filter = (selectedChain: 'all' | 'eth' = 'all') =>
  createFilterBySelectedChain({
    search: '',
    selectedChain,
    chainsFilter: { intents: 'none', external: 'with-balance' },
    supportedChains: ['eth'],
    intentBalances: {},
    walletBalances: {
      'nep141:eth.omft.near-eth': '1000',
      'nep141:usdc-eth-eth': '0',
      'nep141:sol.omft.near-sol': '5',
    },
    uniqueIntentTokenIds: [],
  });

describe('createFilterBySelectedChain: external with-balance', () => {
  it('keeps wallet tokens with a balance', () => {
    expect(filter()(eth)).toBe(true);
    expect(filter('eth')(eth)).toBe(true);
  });

  it('drops wallet tokens without a balance', () => {
    expect(filter()(usdcOnEth)).toBe(false);
  });

  it("drops tokens on chains the wallet isn't on", () => {
    expect(filter()(sol)).toBe(false);
  });
});
