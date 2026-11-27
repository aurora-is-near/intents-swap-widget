import { isAddress, isAddressEqual } from 'viem';
import type { Address } from 'viem';
import type {
  IntentsConnectApi,
  SupportedToken,
} from '@aurora-is-near/intents-connect';

import type { BorrowReserve, CollateralReserve } from '../../types';
import type { AaveMarket } from '../config/registry';
import type { AaveReserves } from '../reserves';

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
   * The native token, when it is delivered on the market's chain: the
   * wrapped-native reserve (WETH) is then collateral supplied from the
   * native token through Aave's gateway, even when 1Click lists WETH too
   * (no solver fills into Base WETH, so the native route is preferred).
   */
  native?: DeliveredAsset & { reserve: Address };
  /**
   * The addresses to read, each once: every delivered token and `native`'s
   * reserve.
   */
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

/**
 * The token's delivery fields, or `undefined` when one is missing or 1Click
 * marks the token `(DEPRECATED)`.
 */
const deliveredAsset = (token: SupportedToken): DeliveredAsset | undefined =>
  nonEmpty(token.assetId) &&
  nonEmpty(token.symbol) &&
  !/\(deprecated\)$/i.test(token.symbol) &&
  Number.isInteger(token.decimals)
    ? { assetId: token.assetId, symbol: token.symbol }
    : undefined;

/** Whether `symbol` names the market's native token (any case). */
const isNativeSymbol = (symbol: string, market: AaveMarket): boolean =>
  market.native !== undefined &&
  symbol.toLowerCase() === market.native.symbol.toLowerCase();

/**
 * Which of the market's reserves 1Click can deliver: tokens on the market's
 * chain (by SDK slug), matched by contract address in any case. Tokens without
 * a chain, contract address, asset id, symbol or decimals are skipped, and so
 * are tokens 1Click marks `(DEPRECATED)` (Polygon lists one beside the
 * current token at the same address, first); when two tokens
 * share an address, the first listed wins.
 *
 * A chain's native token is listed with an empty contract address. When it is
 * listed (by the registry's native symbol), the wrapped-native reserve is read
 * too and counts as collateral delivered natively, whether or not 1Click also
 * lists the wrapped token.
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
      if (isNativeSymbol(asset.symbol, market)) {
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
    market.native && nativeToken
      ? { ...nativeToken, reserve: market.native.reserve }
      : undefined;

  return {
    tokens: delivered,
    ...(native && { native }),
    assets:
      native && !delivered.has(native.reserve.toLowerCase())
        ? [...assets, native.reserve]
        : assets,
  };
};

/**
 * The read reserves with the 1Click asset id and symbol they are delivered
 * as; reserves 1Click cannot deliver are dropped. As collateral, the
 * wrapped-native reserve goes natively whenever the native token is
 * delivered, marked `nativeDelivery`: it keeps the reserve's own symbol
 * (WETH), since that is what Aave holds and what the form shows, and is
 * delivered as the native asset id. As a borrow it stays the ERC-20.
 */
export const withDeliveredAssets = (
  reserves: Pick<AaveReserves, 'collateral' | 'borrowable'>,
  supported: SupportedAssets,
): { collateral: CollateralReserve[]; borrowable: BorrowReserve[] } => {
  const { tokens, native } = supported;

  const collateral = reserves.collateral.flatMap(
    (reserve): CollateralReserve[] => {
      if (native && isAddressEqual(reserve.asset, native.reserve)) {
        return [{ ...reserve, assetId: native.assetId, nativeDelivery: true }];
      }

      const token = tokens.get(reserve.asset.toLowerCase());

      return token ? [{ ...reserve, ...token }] : [];
    },
  );

  const borrowable = reserves.borrowable.flatMap((reserve): BorrowReserve[] => {
    const token = tokens.get(reserve.asset.toLowerCase());

    return token ? [{ ...reserve, ...token }] : [];
  });

  return { collateral, borrowable };
};
