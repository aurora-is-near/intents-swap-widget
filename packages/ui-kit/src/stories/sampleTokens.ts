import { CHAINS } from './filterChips';
import type { TokenOption } from '../components/TokenList/TokenList';
import type { ChainId, Group } from './filterChips';

/*
 * The token stories' sample data, shared by the TokenList and TokenSelect
 * stories. Story-only: not exported from the kit.
 */

/** Tokens from the artboard's sample data (Web-Borrow.dc.html lines 1098–1111). */
export type SampleToken = {
  id: string;
  symbol: string;
  label: string;
  bg: string;
  fg: string;
  price: string;
  group: Exclude<Group, 'all'>;
  chains: ChainId[];
};

export const SAMPLE_TOKENS: readonly SampleToken[] = [
  {
    id: 'wsteth',
    symbol: 'wstETH',
    label: 'ws',
    bg: '#BFE3FF',
    fg: '#0B3350',
    price: '$3,600.00',
    group: 'eth',
    chains: ['eth', 'base', 'arb', 'op'],
  },
  {
    id: 'eth',
    symbol: 'ETH',
    label: 'ET',
    bg: '#DAD9F7',
    fg: '#25235C',
    price: '$3,000.00',
    group: 'eth',
    chains: ['eth', 'base', 'arb', 'op'],
  },
  {
    id: 'weeth',
    symbol: 'weETH',
    label: 'we',
    bg: '#E3D4F7',
    fg: '#3B1F63',
    price: '$3,150.00',
    group: 'eth',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'wbtc',
    symbol: 'WBTC',
    label: 'WB',
    bg: '#FFE2A8',
    fg: '#4A3000',
    price: '$90,000.00',
    group: 'btc',
    chains: ['eth', 'arb', 'op'],
  },
  {
    id: 'cbbtc',
    symbol: 'cbBTC',
    label: 'cb',
    bg: '#C9D7FF',
    fg: '#14275E',
    price: '$90,000.00',
    group: 'btc',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'susds',
    symbol: 'sUSDS',
    label: 'sU',
    bg: '#FFD0E4',
    fg: '#5E0B33',
    price: '$1.08',
    group: 'stable',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'usds',
    symbol: 'USDS',
    label: 'US',
    bg: '#D3F2DF',
    fg: '#0C4325',
    price: '$1.00',
    group: 'stable',
    chains: ['eth', 'base', 'arb'],
  },
];

export const toOption = (token: SampleToken): TokenOption => ({
  id: token.id,
  symbol: token.symbol,
  mark: { label: token.label, bg: token.bg, fg: token.fg },
  chainsLabel: token.chains.map((chain) => CHAINS[chain].name).join(' · '),
  priceLabel: token.price,
});

export const OPTIONS: readonly TokenOption[] = SAMPLE_TOKENS.map(toOption);

/**
 * The wallet's balances in each row's right-hand slot, in place of the
 * price. A row without a balance keeps its price; a held token that can't be
 * picked is disabled, its reason on the chains line.
 */
const HELD: Partial<
  Record<
    string,
    Pick<TokenOption, 'balanceLabel' | 'balanceUsdLabel' | 'unavailableReason'>
  >
> = {
  eth: { balanceLabel: '1.25 ETH', balanceUsdLabel: '$3,750.00' },
  usds: { balanceLabel: '1,200 USDS', balanceUsdLabel: '$1,200.00' },
  cbbtc: {
    balanceLabel: '0.02 cbBTC',
    balanceUsdLabel: '$1,800.00',
    unavailableReason: 'Not supported yet',
  },
};

/** The sample token `id`'s option. */
export const sampleOption = (id: string): TokenOption => {
  const option = OPTIONS.find((item) => item.id === id);

  if (!option) {
    throw new Error(`No sample token ${id}`);
  }

  return option;
};

/** Three held tokens, then one the wallet does not hold (WBTC, its price). */
export const HELD_OPTIONS: readonly TokenOption[] = [
  'eth',
  'usds',
  'cbbtc',
  'wbtc',
].map((id) => ({ ...sampleOption(id), ...HELD[id] }));
