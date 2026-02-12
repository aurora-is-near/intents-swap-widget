export const DEFAULT_TOKEN_ICON = '/icons/widget/unknown-token.png';

type TokenAdditionalData = {
  icon?: string;
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
    name: 'Asian Girl Boss',
  },
  noear: {
    name: 'NOEAR',
  },
  ref: {
    name: 'Ref Finance',
  },
  gnear: {
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
    name: 'Arbitrum',
  },
  avax: {
    name: 'Avalanche',
  },
  base: {
    name: 'Base',
  },
  bera: {
    name: 'Bera',
  },
  bsc: {
    name: 'Binance Smart Chain',
  },
  bnb: {
    name: 'Binance Coin',
  },
  btc: {
    name: 'Bitcoin',
  },
  ada: {
    name: 'Cardano',
  },
  doge: {
    name: 'Dogecoin',
  },
  eth: {
    name: 'Ethereum',
  },
  frax: {
    name: 'FRAZ',
  },
  gnosis: {
    name: 'Gnosis',
  },
  jambo: {
    name: 'Jambo',
  },
  knc: {
    name: 'KNC',
  },
  loud: {
    name: 'Loud',
  },
  mpdao: {
    name: 'mpDAO',
  },
  near: {
    name: 'Near',
  },
  op: {
    name: 'Optimism',
  },
  pol: {
    name: 'Polygon',
  },
  public: {
    name: 'Public',
  },
  purge: {
    name: 'Forgive Me Father',
  },
  rhea: {
    name: 'Rhea',
  },
  sol: {
    name: 'Solana',
  },
  sui: {
    name: 'Sui',
  },
  ton: {
    name: 'Ton',
  },
  tron: {
    name: 'Tron',
  },
  usd1: {
    name: 'USD1',
  },
  usdf: {
    name: 'USDf',
  },
  $wif: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/28752.png',
    name: 'WIF',
  },
  xdai: {
    name: 'xDAI',
  },
  xrp: {
    name: 'Ripple',
  },
  zec: {
    name: 'Zcash',
  },
  xbtc: {
    name: 'xBTC',
  },
  wbtc: {
    name: 'wBTC',
  },
  wnear: {
    name: 'wNEAR',
  },
  weth: {
    name: 'wETH',
  },
  nearkat: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/34150.png',
    name: 'NearKat',
  },
  itlx: {
    name: 'ITLX',
  },
  ltc: {
    name: 'LTC',
  },
  aster: {
    name: 'ASTER',
  },
  spx: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/28081.png',
    name: 'SPX',
  },
  eure: {
    name: 'EURe',
  },
  gbpe: {
    name: 'GBPE',
  },
  cfi: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/39057.png',
    name: 'ConsumerFi Protocol',
  },
  pengu: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/39057.png',
    name: 'Pudgy Penguins',
  },
  inx: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/39461.png',
    name: 'Infinex',
  },
  titn: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/36271.png',
    name: 'Titan',
  },
  evaa: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/38376.png',
    name: 'EVAA Protocol',
  }
};
