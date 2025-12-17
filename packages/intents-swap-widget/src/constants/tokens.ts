export const DEFAULT_TOKEN_ICON = '/icons/widget/unknown-token.png';

type TokenAdditionalData = {
  icon: string | undefined;
  name: string;
};

export const NATIVE_NEAR_DUMB_ASSET_ID = 'native-near';
export const WNEAR_ASSET_ID = 'nep141:wrap.near';

export const TOKENS_DATA: Record<string, TokenAdditionalData> = {
  usdc: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/3408.png',
    name: 'USD Coin',
  },
  usdt: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/825.png',
    name: 'Tether USD',
  },
  dai: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/4943.png',
    name: 'DAI',
  },
  aurora: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/14803.png',
    name: 'Aurora',
  },
  turbo: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/24911.png',
    name: 'Turbo',
  },
  hapi: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/8567.png',
    name: 'HAPI Protocol',
  },
  cbbtc: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/32994.png',
    name: 'Coinbase Wrapped BTC',
  },
  trump: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/35336.png',
    name: 'OFFICIAL TRUMP',
  },
  melania: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/35347.png',
    name: 'Official Melania Meme',
  },
  pepe: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/24478.png',
    name: 'Pepe',
  },
  shib: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/5994.png',
    name: 'Shiba Inu',
  },
  link: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1975.png',
    name: 'Chainlink',
  },
  uni: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/7083.png',
    name: 'Uniswap',
  },
  aave: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/7278.png',
    name: 'Aave',
  },
  gmx: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/11857.png',
    name: 'GMX',
  },
  mog: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/27659.png',
    name: 'Mog Coin',
  },
  brett: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/29743.png',
    name: 'Brett',
  },
  sweat: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/21351.png',
    name: 'Sweat Economy',
  },
  bome: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/29870.png',
    name: 'BOOK OF MEME',
  },
  blackdragon: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/29627.png',
    name: 'Black Dragon',
  },
  shitzu: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/19354.png',
    name: 'Shitzu',
  },
  brrr: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/20604.png',
    name: 'Burrow',
  },
  abg: {
    icon: undefined,
    name: 'Asian Girl Boss',
  },
  noear: {
    icon: undefined,
    name: 'NOEAR',
  },
  ref: {
    icon: undefined,
    name: 'Ref Finance',
  },
  gnear: {
    icon: undefined,
    name: 'gNear',
  },
  gno: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1659.png',
    name: 'Gnosis',
  },
  cow: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/19269.png',
    name: 'CoW Protocol',
  },
  safe: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/21585.png',
    name: 'Safe',
  },
  score: {
    icon: undefined,
    name: 'Trust Score',
  },
  kaito: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/35763.png',
    name: 'KAITO',
  },
  trx: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png',
    name: 'TRX',
  },
  arb: {
    icon: undefined,
    name: 'Arbitrum',
  },
  avax: {
    icon: undefined,
    name: 'Avalanche',
  },
  base: {
    icon: undefined,
    name: 'Base',
  },
  bera: {
    icon: undefined,
    name: 'Bera',
  },
  bsc: {
    icon: undefined,
    name: 'Binance Smart Chain',
  },
  bnb: {
    icon: undefined,
    name: 'Binance Coin',
  },
  btc: {
    icon: undefined,
    name: 'Bitcoin',
  },
  ada: {
    icon: undefined,
    name: 'Cardano',
  },
  doge: {
    icon: undefined,
    name: 'Dogecoin',
  },
  eth: {
    icon: undefined,
    name: 'Ethereum',
  },
  frax: {
    icon: undefined,
    name: 'FRAZ',
  },
  gnosis: {
    icon: undefined,
    name: 'Gnosis',
  },
  jambo: {
    icon: undefined,
    name: 'Jambo',
  },
  knc: {
    icon: undefined,
    name: 'KNC',
  },
  loud: {
    icon: undefined,
    name: 'Loud',
  },
  mpdao: {
    icon: undefined,
    name: 'mpDAO',
  },
  near: {
    icon: undefined,
    name: 'Near',
  },
  op: {
    icon: undefined,
    name: 'Optimism',
  },
  pol: {
    icon: undefined,
    name: 'Polygon',
  },
  public: {
    icon: undefined,
    name: 'Public',
  },
  purge: {
    icon: undefined,
    name: 'Forgive Me Father',
  },
  rhea: {
    icon: undefined,
    name: 'Rhea',
  },
  sol: {
    icon: undefined,
    name: 'Solana',
  },
  sui: {
    icon: undefined,
    name: 'Sui',
  },
  ton: {
    icon: undefined,
    name: 'Ton',
  },
  tron: {
    icon: undefined,
    name: 'Tron',
  },
  usd1: {
    icon: undefined,
    name: 'USD1',
  },
  usdf: {
    icon: undefined,
    name: 'USDf',
  },
  $wif: {
    icon: undefined,
    name: 'WIF',
  },
  xdai: {
    icon: undefined,
    name: 'xDAI',
  },
  xrp: {
    icon: undefined,
    name: 'Ripple',
  },
  zec: {
    icon: undefined,
    name: 'Zcash',
  },
  xbtc: {
    icon: undefined,
    name: 'xBTC',
  },
  wbtc: {
    icon: undefined,
    name: 'wBTC',
  },
  wnear: {
    icon: undefined,
    name: 'wNEAR',
  },
  weth: {
    icon: undefined,
    name: 'wETH',
  },
  nearkat: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/34150.png',
    name: 'NearKat',
  },
  itlx: {
    icon: undefined,
    name: 'ITLX',
  },
  ltc: {
    icon: undefined,
    name: 'LTC',
  },
  aster: {
    icon: undefined,
    name: 'ASTER',
  },
  spx: {
    icon: undefined,
    name: 'SPX',
  },
  eure: {
    icon: undefined,
    name: 'EURe',
  },
  gbpe: {
    icon: undefined,
    name: 'GBPE',
  },
};
