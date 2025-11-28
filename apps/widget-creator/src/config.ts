import { Chain, Chains } from '@aurora-is-near/intents-swap-widget';

export const CHAINS_LIST: Record<Chains, Chain> = {
  near: {
    id: 'near',
    label: 'NEAR',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/near.svg',
  },
  eth: {
    id: 'eth',
    label: 'Ethereum',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/eth.svg',
  },
  sol: {
    id: 'sol',
    label: 'Solana',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/sol.svg',
  },
  base: {
    id: 'base',
    label: 'Base',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/base.svg',
  },
  btc: {
    id: 'btc',
    label: 'Bitcoin',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/btc.svg',
  },
  gnosis: {
    id: 'gnosis',
    label: 'Gnosis',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/gnosis.svg',
  },
  xrp: {
    id: 'xrp',
    label: 'XRP',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/xrp.svg',
  },
  bera: {
    id: 'bera',
    label: 'Bera',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bera.svg',
  },
  tron: {
    id: 'tron',
    label: 'Tron',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/tron.svg',
  },
  zec: {
    id: 'zec',
    label: 'Zcash',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/zec.svg',
  },
  doge: {
    id: 'doge',
    label: 'Dogecoin',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/doge.svg',
  },
  arb: {
    id: 'arb',
    label: 'Arbitrum',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/arb.svg',
  },
  ton: {
    id: 'ton',
    label: 'TON',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/ton.svg',
  },
  op: {
    id: 'op',
    label: 'Optimism',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/op.svg',
  },
  avax: {
    id: 'avax',
    label: 'Avalanche',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/avax.svg',
  },
  pol: {
    id: 'pol',
    label: 'Polygon',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/pol.svg',
  },
  bsc: {
    id: 'bsc',
    label: 'Binance Smart Chain',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bsc.svg',
  },
  sui: {
    id: 'sui',
    label: 'Sui',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/sui.svg',
  },
  cardano: {
    id: 'cardano',
    label: 'Cardano',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/cardano.svg',
  },
  ltc: {
    id: 'ltc',
    label: 'Litecoin',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/ltc.svg',
  },
};

export const TOKENS_DATA: Record<
  string,
  { icon: string | undefined; name: string }
> = {
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
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/abg.png',
    name: 'Asian Girl Boss',
  },
  noear: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/noear.png',
    name: 'NOEAR',
  },
  ref: {
    icon: undefined,
    name: 'Ref Finance',
  },
  gnear: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/gnear.svg',
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
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/arb.svg',
    name: 'Arbitrum',
  },
  avax: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/avax.svg',
    name: 'Avalanche',
  },
  base: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/base.svg',
    name: 'Base',
  },
  bera: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bera.svg',
    name: 'Bera',
  },
  bsc: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bsc.svg',
    name: 'Binance Smart Chain',
  },
  bnb: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bsc.svg',
    name: 'Binance Coin',
  },
  btc: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/btc.svg',
    name: 'Bitcoin',
  },
  ada: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/cardano.svg',
    name: 'Cardano',
  },
  doge: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/doge.svg',
    name: 'Dogecoin',
  },
  eth: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/eth.svg',
    name: 'Ethereum',
  },
  frax: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/frax.png',
    name: 'FRAZ',
  },
  gnosis: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/gnosis.svg',
    name: 'Gnosis',
  },
  jambo: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/jambo.png',
    name: 'Jambo',
  },
  knc: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/knc.svg',
    name: 'KNC',
  },
  loud: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/loud.svg',
    name: 'Loud',
  },
  mpdao: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/mpdao.svg',
    name: 'mpDAO',
  },
  near: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/near.svg',
    name: 'Near',
  },
  op: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/op.svg',
    name: 'Optimism',
  },
  pol: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/pol.svg',
    name: 'Polygon',
  },
  public: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/public.svg',
    name: 'Public',
  },
  purge: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/purge.png',
    name: 'Forgive Me Father',
  },
  rhea: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/rhea.png',
    name: 'Rhea',
  },
  sol: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/sol.svg',
    name: 'Solana',
  },
  sui: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/sui.svg',
    name: 'Sui',
  },
  ton: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/ton.svg',
    name: 'Ton',
  },
  tron: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/tron.svg',
    name: 'Tron',
  },
  usd1: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/usd1.png',
    name: 'USD1',
  },
  usdf: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/usdf.png',
    name: 'USDf',
  },
  $wif: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/wif.png',
    name: 'WIF',
  },
  xdai: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/xdai.svg',
    name: 'xDAI',
  },
  xrp: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/xrp.svg',
    name: 'Ripple',
  },
  zec: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/zec.svg',
    name: 'Zcash',
  },
  xbtc: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/btc.svg',
    name: 'xBTC',
  },
  wbtc: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/btc.svg',
    name: 'wBTC',
  },
  wnear: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/near.svg',
    name: 'wNEAR',
  },
  weth: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/eth.svg',
    name: 'wETH',
  },
  nearkat: {
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/34150.png',
    name: 'NearKat',
  },
  itlx: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/itlx.svg',
    name: 'ITLX',
  },
  ltc: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/ltc.svg',
    name: 'LTC',
  },
  aster: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/aster.svg',
    name: 'ASTER',
  },
  spx: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/spx.svg',
    name: 'SPX',
  },
  eure: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/eure.svg',
    name: 'EURe',
  },
  gbpe: {
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/gbpe.svg',
    name: 'GBPE',
  },
};
