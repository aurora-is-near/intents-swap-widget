import type {
  IntentsConnectApi,
  SupportedToken,
} from '@aurora-is-near/intents-connect';
import { type Address, isAddress, isAddressEqual } from 'viem';

import type { BorrowReserve, CollateralReserve } from '../types';
import type { AaveMarket } from './registry';
import type { AaveReserves } from './reserves';

/** The Intents Connect call the intersection needs. */
export type SupportedTokensApi = Pick<IntentsConnectApi, 'listSupportedTokens'>;

/** What 1Click delivers a reserve as. */
export type DeliveredAsset = {
  /** The 1Click asset id. */
  assetId: string;
  /** As 1Click lists it. */
  symbol: string;
};

/** The market's reserves that 1Click can deliver, before any are read. */
export type SupportedAssets = {
  /** ERC-20 tokens delivered on the market's chain, by lower-case address. */
  tokens: ReadonlyMap<string, DeliveredAsset>;
  /**
   * The native token, when it is delivered on the market's chain but the
   * wrapped-native reserve (WETH) is not: that reserve then counts as
   * collateral, supplied from the native token.
   */
  native?: DeliveredAsset & { reserve: Address };
  /** The addresses to read: every delivered token and `native`'s reserve. */
  assets: Address[];
};

/**
 * The tokens 1Click can deliver (`out` of the `inOperation` flow). A failed
 * call rejects, and so does a reply without the list: a market is never shown
 * as empty because the list could not be read.
 */
export const listDeliveredTokens = async (
  api: SupportedTokensApi,
): Promise<SupportedToken[]> => {
  const { out } = await api.listSupportedTokens('inOperation');

  if (!Array.isArray(out)) {
    throw new Error('Intents Connect: supported tokens reply has no `out`');
  }

  return out;
};

const nonEmpty = (value: string | undefined): value is string =>
  typeof value === 'string' && value !== '';

/** The token's delivery fields, or `undefined` when one is missing. */
const deliveredAsset = (token: SupportedToken): DeliveredAsset | undefined =>
  nonEmpty(token.assetId) &&
  nonEmpty(token.symbol) &&
  Number.isInteger(token.decimals)
    ? { assetId: token.assetId, symbol: token.symbol }
    : undefined;

/**
 * Which of the market's reserves 1Click can deliver: tokens on the market's
 * chain (by SDK slug), matched by contract address in any case. Tokens without
 * a chain, contract address, asset id, symbol or decimals are skipped; when two
 * tokens share an address, the first listed wins.
 *
 * A chain's native token is listed with an empty contract address. When it is
 * listed (by the registry's native symbol) and the wrapped-native reserve is
 * not, that reserve is read too and counts as collateral delivered natively.
 */
export const intersectSupported = (
  tokens: readonly SupportedToken[],
  market: AaveMarket,
): SupportedAssets => {
  const delivered = new Map<string, DeliveredAsset>();
  const assets: Address[] = [];
  let nativeToken: DeliveredAsset | undefined;

  tokens.forEach((token) => {
    if (token.blockchain !== market.chain) {
      return;
    }

    const asset = deliveredAsset(token);

    if (!asset) {
      return;
    }

    const address = token.contractAddress;

    // Only an empty string marks the native token; a missing address is
    // skipped like any other missing field.
    if (address === undefined) {
      return;
    }

    if (address === '') {
      if (
        market.native &&
        asset.symbol.toLowerCase() === market.native.symbol.toLowerCase()
      ) {
        nativeToken ??= asset;
      }

      return;
    }

    if (!isAddress(address, { strict: false })) {
      return;
    }

    const key = address.toLowerCase();

    if (!delivered.has(key)) {
      delivered.set(key, asset);
      assets.push(address);
    }
  });

  const native =
    market.native &&
    nativeToken &&
    !delivered.has(market.native.reserve.toLowerCase())
      ? { ...nativeToken, reserve: market.native.reserve }
      : undefined;

  return {
    tokens: delivered,
    ...(native && { native }),
    assets: native ? [...assets, native.reserve] : assets,
  };
};

/**
 * The read reserves with the 1Click asset id and symbol they are delivered
 * as; reserves 1Click cannot deliver are dropped. The wrapped-native reserve
 * delivered natively is collateral only, marked `nativeDelivery`.
 */
export const withDeliveredAssets = (
  reserves: Pick<AaveReserves, 'collateral' | 'borrowable'>,
  supported: SupportedAssets,
): { collateral: CollateralReserve[]; borrowable: BorrowReserve[] } => {
  const { tokens, native } = supported;

  const collateral = reserves.collateral.flatMap(
    (reserve): CollateralReserve[] => {
      const token = tokens.get(reserve.asset.toLowerCase());

      if (token) {
        return [{ ...reserve, ...token }];
      }

      if (native && isAddressEqual(reserve.asset, native.reserve)) {
        return [
          {
            ...reserve,
            assetId: native.assetId,
            symbol: native.symbol,
            nativeDelivery: true,
          },
        ];
      }

      return [];
    },
  );

  const borrowable = reserves.borrowable.flatMap((reserve): BorrowReserve[] => {
    const token = tokens.get(reserve.asset.toLowerCase());

    return token ? [{ ...reserve, ...token }] : [];
  });

  return { collateral, borrowable };
};
