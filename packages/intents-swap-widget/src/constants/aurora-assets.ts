type AuroraBridgeableAsset = {
  symbol: string;
  evmAddress: `0x${string}`;
  assetId: string;
  decimals: number;
};

// Mappings derived from https://github.com/aurora-is-near/rainbow-bridge-next/blob/main/data/tokens.ts
// and mapped to NEP-141 tokens that https://1click.chaindefuser.com/v0/tokens
// currently returns.
export const AURORA_BRIDGEABLE_ASSETS: AuroraBridgeableAsset[] = [
  {
    symbol: 'AURORA',
    evmAddress: '0x8bec47865ade3b172a928df8f990bc7f2a3b9f79',
    assetId:
      'nep141:aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near',
    decimals: 18,
  },
  {
    symbol: 'wNEAR',
    evmAddress: '0xc42c30ac6cc15fac9bd938618bcaa1a1fae8501d',
    assetId: 'nep141:wrap.near',
    decimals: 24,
  },
  {
    symbol: 'USDC',
    evmAddress: '0x368ebb46aca6b8d0787c96b2b20bd3cc3f2c45f7',
    assetId:
      'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    decimals: 6,
  },
  {
    symbol: 'USDT',
    evmAddress: '0x80da25da4d783e57d2fcda0436873a193a4beccf',
    assetId: 'nep141:usdt.tether-token.near',
    decimals: 6,
  },
  {
    symbol: 'FRAX',
    evmAddress: '0xda2585430fef327ad8ee44af8f1f989a2a91a3d2',
    assetId:
      'nep141:853d955acef822db058eb8505911ed77f175b99e.factory.bridge.near',
    decimals: 18,
  },
  {
    symbol: 'WBTC',
    evmAddress: '0xf4eb217ba2454613b15dbdea6e5f22276410e89e',
    assetId:
      'nep141:2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near',
    decimals: 8,
  },
  {
    symbol: 'HAPI',
    evmAddress: '0x943f4bf75d5854e92140403255a471950ab8a26f',
    assetId:
      'nep141:d9c2d319cd7e6177336b0a9c93c21cb48d84fb54.factory.bridge.near',
    decimals: 18,
  },
  {
    symbol: 'STNEAR',
    evmAddress: '0x07f9f7f963c5cd2bbffd30ccfb964be114332e30',
    assetId: 'nep141:meta-pool.near',
    decimals: 24,
  },
];

const AURORA_BRIDGEABLE_ASSETS_MAP = new Map<string, AuroraBridgeableAsset>(
  AURORA_BRIDGEABLE_ASSETS.map((a) => [a.assetId.toLowerCase(), a]),
);

export const isAuroraBridgeable = (assetId: string): boolean =>
  AURORA_BRIDGEABLE_ASSETS_MAP.has(assetId.toLowerCase());
