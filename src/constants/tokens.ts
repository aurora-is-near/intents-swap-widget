export const DEFAULT_TOKEN_ICON = '/icons/widget/unknown-token.png';

type TokenAdditionalData = {
  icon: string | undefined;
  name: string;
};

export const TOKENS_DATA: Record<string, TokenAdditionalData> = {
  usdc: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/3408.png',
    name: 'USD Coin',
  },
  zcash: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1437.png',
    name: 'Zcash',
  },
  near: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/6535.png',
    name: 'Near',
  },
  usdt: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/825.png',
    name: 'Tether USD',
  },
  dai: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/4943.png',
    name: 'DAI',
  },
  eth: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1027.png',
    name: 'Ethereum',
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
  bera: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/24647.png',
    name: 'BERA',
  },
  btc: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1.png',
    name: 'Bitcoin',
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
  arb: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/11841.png',
    name: 'Arbitrum',
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
  sol: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/5426.png',
    name: 'Solana',
  },
  doge: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/74.png',
    name: 'Dogecoin',
  },
  xrp: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/52.png',
    name: 'XRP',
  },
  wif: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/128x128/28752.png',
    name: 'dogwifhat',
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
  purge: {
    icon: undefined,
    name: 'Forgive Me Father',
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
  mpdao: {
    icon: undefined,
    name: 'Meta DAO Governance Token',
  },
  gnear: {
    icon: undefined,
    name: 'GNear',
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
};
