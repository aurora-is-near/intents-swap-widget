import { describe, expect, it, vi } from 'vitest';
import type { SupportedToken } from '@aurora-is-near/intents-connect';

import { AAVE_V3_MARKETS } from '../../config/registry';
import {
  intersectSupported,
  listDeliveredTokens,
  withDeliveredAssets,
} from '../supported';
import type {
  AaveBorrowReserve,
  AaveCollateralReserve,
  AaveReserves,
} from '../../reserves';

const marketOf = (chain: string) => {
  const found = AAVE_V3_MARKETS.find((entry) => entry.chain === chain);

  if (!found?.native) {
    throw new Error(`No ${chain} market with a wrapped native reserve`);
  }

  return { market: found, wrapped: found.native.reserve };
};

const { market: base, wrapped: WETH } = marketOf('base');
const { market: arb, wrapped: ARB_WETH } = marketOf('arb');
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const usdcToken: SupportedToken = {
  blockchain: 'base',
  contractAddress: USDC.toLowerCase(),
  assetId: 'nep141:base-usdc.omft.near',
  symbol: 'USDC',
  decimals: 6,
};

const ethToken: SupportedToken = {
  blockchain: 'base',
  contractAddress: '',
  assetId: 'nep141:base.omft.near',
  symbol: 'ETH',
  decimals: 18,
};

const wethToken: SupportedToken = {
  blockchain: 'base',
  contractAddress: WETH.toLowerCase(),
  assetId: 'nep141:base-weth.omft.near',
  symbol: 'WETH',
  decimals: 18,
};

const collateral = (
  overrides: Partial<AaveCollateralReserve> = {},
): AaveCollateralReserve => ({
  asset: USDC,
  symbol: 'USDC',
  decimals: 6,
  maxLtvBps: 7500,
  liquidationLtvBps: 7800,
  priceBase: 100_000_000n,
  ...overrides,
});

const borrowable = (
  overrides: Partial<AaveBorrowReserve> = {},
): AaveBorrowReserve => ({
  asset: USDC,
  symbol: 'USDC',
  decimals: 6,
  variableBorrowApr: 0.05,
  availableLiquidity: 1_000_000n,
  priceBase: 100_000_000n,
  ...overrides,
});

const reserves = (
  overrides: Partial<Pick<AaveReserves, 'collateral' | 'borrowable'>> = {},
) => ({
  collateral: [collateral()],
  borrowable: [borrowable()],
  ...overrides,
});

describe('listDeliveredTokens', () => {
  it('asks for the inOperation flow and returns its destinations', async () => {
    const listSupportedTokens = vi
      .fn()
      .mockResolvedValue({ in: [ethToken], out: [usdcToken] });

    await expect(listDeliveredTokens({ listSupportedTokens })).resolves.toEqual(
      [usdcToken],
    );
    expect(listSupportedTokens).toHaveBeenCalledWith('inOperation');
  });

  it('rejects when the list cannot be read', async () => {
    const listSupportedTokens = vi
      .fn()
      .mockRejectedValue(new Error('Intents Connect API responded 503'));

    await expect(listDeliveredTokens({ listSupportedTokens })).rejects.toThrow(
      'responded 503',
    );
  });

  it('rejects a reply without destinations instead of returning none', async () => {
    const listSupportedTokens = vi.fn().mockResolvedValue({ in: [] });

    await expect(listDeliveredTokens({ listSupportedTokens })).rejects.toThrow(
      'no `out`',
    );
  });
});

describe('intersectSupported', () => {
  it('matches addresses in any case and carries the asset id and symbol', () => {
    const supported = intersectSupported(
      [
        {
          ...usdcToken,
          contractAddress: USDC.toUpperCase().replace('0X', '0x'),
        },
      ],
      base,
    );

    expect(supported.assets).toHaveLength(1);
    expect(supported.assets[0]?.toLowerCase()).toBe(USDC.toLowerCase());

    const result = withDeliveredAssets(
      reserves({
        // The 1Click symbol replaces the reserve's own.
        collateral: [collateral({ symbol: 'USDC.e' })],
        borrowable: [borrowable({ symbol: 'USDC.e' })],
      }),
      supported,
    );

    expect(result.collateral).toEqual([
      { ...collateral(), assetId: usdcToken.assetId, symbol: 'USDC' },
    ]);
    expect(result.borrowable).toEqual([
      { ...borrowable(), assetId: usdcToken.assetId, symbol: 'USDC' },
    ]);
  });

  it('does not match a token on another chain', () => {
    const supported = intersectSupported(
      [
        { ...usdcToken, blockchain: 'arb' },
        { ...usdcToken, blockchain: 'eth' },
      ],
      base,
    );

    expect(supported.assets).toEqual([]);
    expect(withDeliveredAssets(reserves(), supported)).toEqual({
      collateral: [],
      borrowable: [],
    });
  });

  it.each([
    ['chain', { blockchain: undefined }],
    ['address', { contractAddress: undefined }],
    ['malformed address', { contractAddress: '0x1234' }],
    ['asset id', { assetId: undefined }],
    ['empty asset id', { assetId: '' }],
    ['symbol', { symbol: undefined }],
    ['decimals', { decimals: undefined }],
  ] satisfies [string, Partial<SupportedToken>][])(
    'skips a token missing its %s',
    (_, overrides) => {
      const supported = intersectSupported(
        [{ ...usdcToken, ...overrides }],
        base,
      );

      expect(supported.assets).toEqual([]);
      expect(withDeliveredAssets(reserves(), supported).collateral).toEqual([]);
    },
  );

  it('keeps the first of two tokens with the same address', () => {
    const supported = intersectSupported(
      [usdcToken, { ...usdcToken, assetId: 'second' }],
      base,
    );

    expect(supported.assets).toHaveLength(1);
    expect(supported.tokens.get(USDC.toLowerCase())?.assetId).toBe(
      usdcToken.assetId,
    );
  });

  it('includes WETH as natively delivered collateral when only native ETH is listed', () => {
    const supported = intersectSupported([ethToken, usdcToken], base);

    expect(supported.assets).toEqual([USDC.toLowerCase(), WETH]);

    const weth = { asset: WETH, symbol: 'WETH', decimals: 18 };
    const result = withDeliveredAssets(
      reserves({
        collateral: [collateral(weth)],
        borrowable: [borrowable(weth)],
      }),
      supported,
    );

    // The reserve keeps its own symbol: Aave holds WETH, the form says so.
    expect(result.collateral).toEqual([
      {
        ...collateral(weth),
        assetId: ethToken.assetId,
        nativeDelivery: true,
      },
    ]);
    // Native delivery is a collateral route only.
    expect(result.borrowable).toEqual([]);
  });

  it('delivers WETH collateral as native ETH when both are listed, reading WETH once', () => {
    const supported = intersectSupported([wethToken, ethToken], base);

    expect(supported.native).toEqual({
      assetId: ethToken.assetId,
      symbol: 'ETH',
      reserve: WETH,
    });
    expect(supported.assets).toEqual([WETH.toLowerCase()]);

    const weth = { asset: WETH, symbol: 'WETH', decimals: 18 };
    const result = withDeliveredAssets(
      reserves({
        collateral: [collateral(weth), collateral()],
        borrowable: [borrowable(weth)],
      }),
      supported,
    );

    expect(result.collateral).toEqual([
      {
        ...collateral(weth),
        assetId: 'nep141:base.omft.near',
        nativeDelivery: true,
      },
    ]);
    // Borrowing WETH still takes the listed ERC-20.
    expect(result.borrowable).toEqual([
      { ...borrowable(weth), assetId: wethToken.assetId },
    ]);
  });

  it('delivers WETH collateral as native ETH on Arbitrum too', () => {
    const arbEth: SupportedToken = {
      ...ethToken,
      blockchain: 'arb',
      assetId: 'nep141:arb.omft.near',
    };

    const arbWeth: SupportedToken = {
      ...wethToken,
      blockchain: 'arb',
      contractAddress: ARB_WETH.toLowerCase(),
      assetId: `nep141:arb-${ARB_WETH.toLowerCase()}.omft.near`,
    };

    const supported = intersectSupported([arbEth, arbWeth], arb);

    expect(supported.assets).toEqual([ARB_WETH.toLowerCase()]);

    const weth = { asset: ARB_WETH, symbol: 'WETH', decimals: 18 };
    const result = withDeliveredAssets(
      reserves({ collateral: [collateral(weth)], borrowable: [] }),
      supported,
    );

    expect(result.collateral).toEqual([
      {
        ...collateral(weth),
        assetId: 'nep141:arb.omft.near',
        nativeDelivery: true,
      },
    ]);
  });

  it('keeps WETH as a token delivery when native ETH is not listed', () => {
    const supported = intersectSupported([wethToken, usdcToken], base);

    expect(supported.native).toBeUndefined();
    expect(supported.assets).toEqual([WETH.toLowerCase(), USDC.toLowerCase()]);

    const weth = { asset: WETH, symbol: 'WETH', decimals: 18 };
    const result = withDeliveredAssets(
      reserves({ collateral: [collateral(weth)], borrowable: [] }),
      supported,
    );

    expect(result.collateral).toEqual([
      { ...collateral(weth), assetId: wethToken.assetId },
    ]);
    expect(result.collateral[0]).not.toHaveProperty('nativeDelivery');
  });

  it('does not take another native token for ETH', () => {
    const supported = intersectSupported(
      [{ ...ethToken, symbol: 'POL', assetId: 'nep141:pol' }],
      base,
    );

    expect(supported.native).toBeUndefined();
    expect(supported.assets).toEqual([]);
  });

  it('skips native ETH missing its asset id', () => {
    const supported = intersectSupported(
      [{ ...ethToken, assetId: undefined }],
      base,
    );

    expect(supported.native).toBeUndefined();
  });

  it('does not take ETH without a contract address field for native ETH', () => {
    const supported = intersectSupported(
      [{ ...ethToken, contractAddress: undefined }],
      base,
    );

    expect(supported.native).toBeUndefined();
    expect(supported.assets).toEqual([]);
  });
});
