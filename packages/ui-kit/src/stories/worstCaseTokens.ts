import { OPTIONS, sampleOption } from './sampleTokens';
import type { TokenOption } from '../components/TokenList/TokenList';
import type { TokenSelectProps } from '../components/TokenSelect/TokenSelect';

/*
 * The worst realistic data for the token picker, beside the demo data in
 * `sampleTokens.ts`. Every value is one a live app shows: Arbitrum's
 * `USD₮0` and `USDC.e` symbols, a token on eight chains, a seven-figure
 * stablecoin balance, a dust balance, a logo URL that 404s, a reason a held
 * token can't be picked. The failures are spread across the first rows,
 * which are what the popup shows. Story-only: not exported from the kit.
 */

const EVERY_CHAIN =
  'Ethereum · Base · Arbitrum · Optimism · Polygon · BNB Chain · Avalanche · Gnosis';

export const WORST_OPTIONS: readonly TokenOption[] = [
  {
    // A whale's stablecoin balance on every chain, in Arbitrum's symbol.
    id: 'usdt0',
    symbol: 'USD₮0',
    mark: { label: 'US', bg: '#CDEBDD', fg: '#0E4A2C' },
    chainsLabel: EVERY_CHAIN,
    priceLabel: '$1.00',
    balanceLabel: '1,234,567.89',
    balanceUsdLabel: '$1,234,567.89',
  },
  {
    // A token logo from a CDN that no longer serves it.
    id: 'wsteth',
    symbol: 'wstETH',
    mark: {
      label: 'ws',
      bg: '#BFE3FF',
      fg: '#0B3350',
      src: 'https://tokens.example.invalid/logos/wsteth.png',
    },
    chainsLabel: 'Ethereum · Base · Arbitrum · Optimism',
    priceLabel: '$3,600.00',
  },
  {
    // Held, but not supported: the reason is what the user needs to read.
    id: 'cbbtc',
    symbol: 'cbBTC',
    mark: { label: 'cb', bg: '#C9D7FF', fg: '#14275E' },
    chainsLabel: 'Ethereum · Base · Arbitrum',
    priceLabel: '$104,250.00',
    balanceLabel: '0.00012345',
    balanceUsdLabel: '$12.87',
    unavailableReason: 'Not supported yet',
  },
  {
    // A bridged stablecoin's symbol, a price with four decimals.
    id: 'usdce',
    symbol: 'USDC.e',
    mark: { label: 'US', bg: '#D6E6FF', fg: '#123A73' },
    chainsLabel: 'Arbitrum · Avalanche · Polygon',
    priceLabel: '$0.9998',
  },
  {
    // A six-figure price with no balance.
    id: 'wbtc',
    symbol: 'WBTC',
    mark: { label: 'WB', bg: '#FFE2A8', fg: '#4A3000' },
    chainsLabel: 'Ethereum · Arbitrum · Optimism',
    priceLabel: '$104,250.00',
  },
  ...OPTIONS.slice(2),
];

/** The trigger showing the worst-case selection: long symbol, long chain. */
export const WORST_SELECTED: TokenSelectProps['selected'] = {
  symbol: 'USD₮0',
  mark: { label: 'US', bg: '#CDEBDD', fg: '#0E4A2C' },
  chainName: 'Avalanche C-Chain',
  chainColor: '#E84142',
};

/** One token: the list's smallest non-empty state. */
export const ONE_OPTION: readonly TokenOption[] = [sampleOption('eth')];
